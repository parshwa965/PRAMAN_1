import http from 'node:http';
import { URL } from 'node:url';
import { signAccess, verifyAccess, issueRefresh, rotateRefresh } from './auth/index.js';
import { can } from './auth/rbac.js';
import { append as auditAppend } from './auth/audit.js';
import { draw, appendTamperLog, rotationLog } from './assignment/index.js';
import { findDuplicates, headcountAnomaly, mortalityCheck, heartbeatGap, fundGap } from './anomaly/index.js';
import { registerCamera, heartbeat, getStatus, scheduleVC } from './monitor/index.js';
import { checkSLA, escalate, FileTracker, notify } from './workflow/index.js';
import { facilities as facilitiesDb, grants as grantsDb, beneficiaries as beneficiariesDb } from './db/index.js';

let isAllowed = () => true, maskPII = (o) => o;
try {
  const sec = await import('./security/index.js');
  maskPII = sec.maskPII || maskPII;
  if (sec.rateLimit) { const limiter = sec.rateLimit({ windowMs: 60000, max: 100 }); const fn = limiter.isAllowed || limiter; isAllowed = (ip) => { try { const r = fn(String(ip)); return r && typeof r === 'object' ? r.allowed !== false : true; } catch { return true; } }; }
} catch { /* fallback open */ }

const PORT = process.env.PORT || 3001;
const users = new Map([
  ['dept1', { id: 'dept1', password: 'dept-pass', role: 'Dept' }],
  ['pmu1', { id: 'pmu1', password: 'pmu-pass', role: 'PMU' }],
  ['ngo1', { id: 'ngo1', password: 'ngo-pass', role: 'NGO_Auth' }],
]);
const inspectors = [
  { id: 'INSP-01', district: 'Gaya', workload: 1, lastAssignment: '2024-01-01' },
  { id: 'INSP-02', district: 'Kochi', workload: 0, lastAssignment: '2024-01-01' },
  { id: 'INSP-03', district: 'Bhopal', workload: 2, lastAssignment: '2024-01-01' },
];
const assignHistory = [];

const send = (res, code, obj) => {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(obj));
};
const body = (req) => new Promise((res) => { let d = ''; req.on('data', (c) => (d += c)); req.on('end', () => { try { res(JSON.parse(d || '{}')); } catch { res({}); } }); });
const auth = (req) => {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return null;
  try { return verifyAccess(h.slice(7)); } catch { return null; }
};

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' }); return res.end(); }
  const u = new URL(req.url, 'http://x');
  const ip = req.socket.remoteAddress || 'local';
  if (!isAllowed(ip)) return send(res, 429, { error: { code: 'RATE_LIMIT', message: 'too many requests' } });
  try {
    if (u.pathname === '/api/auth/login' && req.method === 'POST') {
      const b = await body(req);
      const loginId = b.userId || b.loginId || b.username;
      const usr = users.get(loginId);
      if (!usr || usr.password !== b.password) return send(res, 401, { error: { code: 'AUTH_REQUIRED', message: 'bad credentials' } });
      const device = req.headers['x-device-id'] || 'default-device';
      const access = signAccess({ sub: usr.id, role: usr.role });
      const refresh = issueRefresh(usr.id, String(device));
      auditAppend(usr.id, 'login', 'user', usr.id);
      return send(res, 200, { access, accessToken: access, refresh, refreshToken: refresh, role: usr.role === 'NGO_Auth' ? 'NGO' : usr.role, userId: usr.id });
    }
    if (u.pathname === '/api/auth/refresh' && req.method === 'POST') {
      const b = await body(req);
      const device = req.headers['x-device-id'] || 'default-device';
      const r = rotateRefresh(b.refresh, String(device));
      return send(res, 200, { access: signAccess({ sub: r.userId }), refresh: r.token });
    }
    const user = auth(req);
    if (!user) return send(res, 401, { error: { code: 'AUTH_REQUIRED', message: 'login required' } });
     if (u.pathname === '/api/dashboard/overview') { const toLakh = (v) => Math.round((v / 100000) * 10) / 10; const allGrants = grantsDb.all(); const allFacilities = facilitiesDb.all(); const bySchemeMap = new Map(); for (const g of allGrants) { const cur = bySchemeMap.get(g.scheme) || { name: g.scheme, sanctioned: 0, released: 0 }; cur.sanctioned += g.sanctioned; cur.released += g.released; bySchemeMap.set(g.scheme, cur); } const schemes = [...bySchemeMap.values()].map((s) => ({ name: s.name, sanctioned: toLakh(s.sanctioned), released: toLakh(s.released) })); const fundsReleasedLakh = toLakh(allGrants.reduce((sum, g) => sum + g.released, 0)); const alerts = allGrants .filter((g) => g.stage === 'complete' && g.utilized < g.released * 0.9) .map((g) => ({ type: 'fund-gap', detail: `${g.facility_id}: released ${toLakh(g.released)}L vs utilized ${toLakh(g.utilized)}L at stage complete` })); return send(res, 200, { funds_released_lakh: fundsReleasedLakh, facilities: allFacilities.length, alerts_open: alerts.length, schemes, alerts, }); }
    if (u.pathname === '/api/assignments/draw' && req.method === 'POST') {
      if (!can(user.role, 'assignment.draw')) return send(res, 403, { error: { code: 'FORBIDDEN', message: 'Dept only' } });
      const b = await body(req);
      const r = draw({ facilityId: b.facilityId || b.facility_id || 'FAC-01', district: b.district || 'Gaya', inspectors, history: assignHistory });
      assignHistory.push({ inspectorId: r.inspectorId, district: r.district, ts: r.window.start });
      appendTamperLog({ actor: user.sub, action: 'assignment.draw', ...r });
      auditAppend(user.sub, 'assignment.draw', 'assignment', r.inspectorId);
      return send(res, 200, r);
    }
    if (u.pathname === '/api/assignments/rotation') return send(res, 200, { log: rotationLog() });
     if (u.pathname === '/api/anomalies') { const type = u.searchParams.get('type') || 'all'; const toLakh = (v) => Math.round((v / 100000) * 10) / 10; const items = []; for (const b of beneficiariesDb.all()) { if (b.status === 'dead') { items.push({ id: 'an-mort-' + b.id, type: 'mortality', score: 0.97, facility_id: b.facility_id, detail: `${b.id} marked dead in registry but still active under ${b.scheme}`, evidence_ids: [] }); } else if (b.status === 'discharged') { items.push({ id: 'an-mort-' + b.id, type: 'mortality', score: 0.7, facility_id: b.facility_id, detail: `${b.id} discharged from ${b.scheme} but still shows active`, evidence_ids: [] }); } } for (const g of grantsDb.all()) { if (g.stage === 'complete' && g.utilized < g.released * 0.9) { items.push({ id: 'an-fund-' + g.id, type: 'fund-gap', score: 0.85, facility_id: g.facility_id, detail: `${g.facility_id}: released ${toLakh(g.released)}L vs utilized ${toLakh(g.utilized)}L at stage complete`, evidence_ids: [] }); } } const filtered = type === 'all' ? items : items.filter((a) => a.type === type); return send(res, 200, { items: filtered }); }
    if (u.pathname.startsWith('/api/cctv/') && u.pathname.endsWith('/status')) {
      const fid = u.pathname.split('/')[3];
      try { return send(res, 200, getStatus(fid) || { facilityId: fid, status: 'offline', lastHeartbeat: null }); }
      catch { return send(res, 200, { facilityId: fid, status: 'offline', lastHeartbeat: null }); }
    }
    if (u.pathname === '/api/vc/schedule' && req.method === 'POST') {
      const b = await body(req);
      return send(res, 200, scheduleVC({ facilityId: b.facilityId || 'FAC-01', random: b.random !== false, from: user.sub }));
    }
    if (u.pathname === '/api/evidence/server-time') return send(res, 200, { serverTs: Date.now() });
    return send(res, 404, { error: { code: 'NOT_FOUND', message: 'no route' } });
  } catch (e) {
    const code = e.code === 'CONFLICT' ? 409 : e.code === 'VALIDATION' ? 400 : e.code === 'AUTH_REQUIRED' ? 401 : e.code === 'FORBIDDEN' ? 403 : 500;
    return send(res, code, { error: { code: e.code || 'INTERNAL', message: e.message } });
  }
});

server.listen(PORT, () => console.log(`praman api on ${PORT}`));

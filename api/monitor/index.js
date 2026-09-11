import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';

// CCTV registry: facilityId -> { url, status, lastHeartbeat }
export const HEARTBEAT_GAP_MS = 24 * 60 * 60 * 1000;
export const CCTV_URL_TTL_MS = 5 * 60 * 1000;

export const cctvRegistry = new Map();

// vc_log rows: { id, from_role, to_user, facility_id, started_at, ended_at, outcome }
export const vc_log = [];

// signalling store: sessionId -> { offer, answer, createdAt, updatedAt }
export const sessions = new Map();

function assertId(id, name = 'facilityId') {
  if (typeof id !== 'string' || !id.trim()) throw new Error(`${name} required`);
  return id.trim();
}

export function registerCamera(facilityId, url, now = Date.now()) {
  facilityId = assertId(facilityId);
  if (typeof url !== 'string' || !url.trim()) throw new Error('url required');
  const e = { url: url.trim(), status: 'online', lastHeartbeat: Number(now) || Date.now() };
  cctvRegistry.set(facilityId, e);
  return { facilityId, ...e };
}

export function heartbeat(facilityId, now = Date.now()) {
  facilityId = assertId(facilityId);
  const e = cctvRegistry.get(facilityId);
  if (!e) throw new Error('unknown facility: ' + facilityId);
  e.lastHeartbeat = Number(now) || Date.now();
  e.status = 'online';
  return { facilityId, ...e };
}

export function setOffline(facilityId) {
  facilityId = assertId(facilityId);
  const e = cctvRegistry.get(facilityId);
  if (!e) throw new Error('unknown facility: ' + facilityId);
  e.status = 'offline';
  return { facilityId, ...e };
}

// Heartbeat gap detector: gap=true when now-lastHeartbeat > 24h.
export function getStatus(facilityId, now = Date.now()) {
  facilityId = assertId(facilityId);
  const e = cctvRegistry.get(facilityId);
  if (!e) throw new Error('unknown facility: ' + facilityId);
  const t = Number(now) || Date.now();
  const gapMs = t - e.lastHeartbeat;
  const gap = gapMs > HEARTBEAT_GAP_MS;
  const status = gap ? 'offline' : e.status;
  return { facilityId, url: e.url, status, lastHeartbeat: e.lastHeartbeat, gapMs, gap, stale: gap };
}

export function listCameras(now = Date.now()) {
  return [...cctvRegistry.keys()].map((id) => getStatus(id, now));
}

function rand01(random) {
  if (typeof random === 'function') return random();
  if (typeof random === 'number') return random;
  return Math.random();
}

// Uniform random pick; seed = number 0..1 or function returning 0..1.
export function pickRandomFacility(facilities, seed) {
  if (!Array.isArray(facilities) || !facilities.length) throw new Error('facilities non-empty array required');
  const r = typeof seed === 'function' ? seed() : typeof seed === 'number' ? seed : rand01(seed);
  const idx = Math.min(facilities.length - 1, Math.floor((r - Math.floor(r)) * facilities.length));
  return facilities[idx];
}

export function scheduleVC({ facilityId, fromRole = 'PMU', toUser = null, scheduledAt = null, random } = {}) {
  facilityId = assertId(facilityId);
  const id = randomUUID();
  const at = scheduledAt ? new Date(scheduledAt).toISOString() : new Date().toISOString();
  if (Number.isNaN(Date.parse(at))) throw new Error('invalid scheduledAt');
  const token = randomBytes(16).toString('hex');
  if (typeof random === 'function') random(); // consume caller entropy if supplied
  const row = { id, from_role: fromRole, to_user: toUser, facility_id: facilityId, started_at: at, ended_at: null, outcome: 'scheduled' };
  vc_log.push(row);
  return { id, facilityId, scheduledAt: at, token, fromRole, toUser };
}

// Surprise scheduler: uniform random facility + immediate VC log entry.
export function scheduleSurpriseVC(facilities, { fromRole = 'PMU', toUser = null, seed, random } = {}) {
  const pick = pickRandomFacility(facilities, seed ?? random);
  const facilityId = typeof pick === 'string' ? pick : pick?.id ?? pick?.facility_id ?? assertId(String(pick), 'facility.id');
  const vc = scheduleVC({ facilityId, fromRole, toUser, random: typeof random === 'function' ? random : undefined });
  return { ...vc, surprise: true };
}
// Alias kept for gate/readability: surprise scheduler entry point.
export const scheduleSurpriseCall = scheduleSurpriseVC;

// --- WebRTC signalling stub (in-memory, no external service) ---
export function createOffer(sessionId, sdp) {
  sessionId = assertId(sessionId, 'sessionId');
  if (!sdp) throw new Error('sdp required');
  const s = sessions.get(sessionId) ?? { sessionId, createdAt: Date.now() };
  s.offer = sdp;
  s.updatedAt = Date.now();
  sessions.set(sessionId, s);
  return { ...s };
}

export function createAnswer(sessionId, sdp) {
  sessionId = assertId(sessionId, 'sessionId');
  if (!sdp) throw new Error('sdp required');
  const s = sessions.get(sessionId);
  if (!s?.offer) throw new Error('no offer for session: ' + sessionId);
  s.answer = sdp;
  s.updatedAt = Date.now();
  sessions.set(sessionId, s);
  return { ...s };
}

export function getSession(sessionId) {
  sessionId = assertId(sessionId, 'sessionId');
  const s = sessions.get(sessionId);
  return s ? { ...s } : null;
}

export function closeSession(sessionId) {
  return sessions.delete(assertId(sessionId, 'sessionId'));
}

// --- Signed cctv URL: HMAC-SHA256, 5min expiry, CCTV_SECRET env ---
export function signCctvUrl(facilityId, { baseUrl, secret = process.env.CCTV_SECRET ?? 'dev-secret', ttlMs = CCTV_URL_TTL_MS, now = Date.now() } = {}) {
  facilityId = assertId(facilityId);
  const e = cctvRegistry.get(facilityId);
  const base = (baseUrl ?? e?.url ?? '').trim();
  if (!base) throw new Error('no base URL: register camera or pass baseUrl');
  if (!secret) throw new Error('CCTV_SECRET required');
  const exp = (Number(now) || Date.now()) + ttlMs;
  const data = `${facilityId}.${exp}`;
  const sig = createHmac('sha256', secret).update(data).digest('hex');
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}facility=${encodeURIComponent(facilityId)}&exp=${exp}&sig=${sig}`;
}

export function verifyCctvUrl(facilityId, exp, sig, { secret = process.env.CCTV_SECRET ?? 'dev-secret', now = Date.now() } = {}) {
  facilityId = assertId(facilityId, 'facilityId');
  const t = Number(now) || Date.now();
  if (!Number.isFinite(Number(exp)) || Number(exp) <= t) return false;
  if (typeof sig !== 'string' || !sig) return false;
  const want = createHmac('sha256', secret).update(`${facilityId}.${exp}`).digest('hex');
  if (want.length !== sig.length) return false;
  let d = 0;
  for (let i = 0; i < want.length; i++) d |= want.charCodeAt(i) ^ sig.charCodeAt(i);
  return d === 0;
}

// Optional express router factory; throws if express absent. No express dep.
export function router() {
  let express;
  try {
    express = createRequire(import.meta.url)('express');
  } catch {
    throw new Error('express not installed: router() requires express');
  }
  const r = express.Router();
  r.post('/vc/schedule', (req, res) => {
    try {
      res.json(scheduleVC(req.body ?? {}));
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });
  r.post('/vc/surprise', (req, res) => {
    try {
      const { facilities, ...opts } = req.body ?? {};
      res.json(scheduleSurpriseVC(facilities, opts));
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });
  r.get('/cctv/:facility/status', (req, res) => {
    try {
      res.json(getStatus(req.params.facility));
    } catch (e) {
      res.status(404).json({ error: e.message });
    }
  });
  r.get('/cctv/:facility/url', (req, res) => {
    try {
      res.json({ url: signCctvUrl(req.params.facility) });
    } catch (e) {
      res.status(404).json({ error: e.message });
    }
  });
  return r;
}

export default { cctvRegistry, vc_log, sessions, registerCamera, heartbeat, setOffline, getStatus, listCameras, pickRandomFacility, scheduleVC, scheduleSurpriseVC, scheduleSurpriseCall, createOffer, createAnswer, getSession, closeSession, signCctvUrl, verifyCctvUrl, router, HEARTBEAT_GAP_MS, CCTV_URL_TTL_MS };

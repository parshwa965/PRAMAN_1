import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// repo-root data/assignment-log.json (same convention as api/auth/audit.js); override for tests via env or arg
export const LOG_FILE =
  process.env.PRAMAN_DATA_DIR
    ? path.join(process.env.PRAMAN_DATA_DIR, 'assignment-log.json')
    : path.join(__dirname, '../../data/assignment-log.json');

export const COOLING_MS = 30 * 24 * 60 * 60 * 1000;
export const WINDOW_MS = 48 * 60 * 60 * 1000;
const GENESIS = 'GENESIS';

const err = (message, code) => Object.assign(new Error(message), { code });
const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');

const logFile = (override) =>
  override ||
  (process.env.PRAMAN_DATA_DIR
    ? path.join(process.env.PRAMAN_DATA_DIR, 'assignment-log.json')
    : LOG_FILE);

function latestHistoryFor(history, inspectorId) {
  let best = null;
  for (const h of history) {
    if (!h || h.inspectorId !== inspectorId) continue;
    if (!h.ts) return h; // undated entry still counts as "served before"
    if (!best || new Date(h.ts) > new Date(best.ts)) best = h;
  }
  return best;
}

// Weighted draw: lower workload preferred. Rejects inspectors in 30d cooling
// or whose last served district equals the target district (no same district twice).
export function draw(
  { facilityId, district, inspectors = [], history = [] } = {},
  opts = {},
) {
  if (!facilityId || typeof facilityId !== 'string') throw err('facilityId required', 'VALIDATION');
  if (!district || typeof district !== 'string') throw err('district required', 'VALIDATION');
  if (!Array.isArray(inspectors) || !inspectors.length) throw err('inspectors required', 'VALIDATION');
  if (!Array.isArray(history)) throw err('history must be an array', 'VALIDATION');

  const now = opts.now ? new Date(opts.now) : new Date();
  if (Number.isNaN(now.getTime())) throw err('invalid now', 'VALIDATION');
  const rand = typeof opts.random === 'function' ? opts.random : Math.random;

  const eligible = [];
  for (const insp of inspectors) {
    if (!insp || !insp.id) continue;
    // 30d cooling: lastAssignment must be older than COOLING_MS
    const lastTs = insp.lastAssignment ? new Date(insp.lastAssignment) : null;
    if (lastTs && !Number.isNaN(lastTs.getTime()) && now - lastTs < COOLING_MS) continue; // cooling
    // no same district twice: last served district (history wins, inspector.district is fallback)
    const last = latestHistoryFor(history, insp.id);
    const lastDistrict = (last && last.district) || insp.district;
    if (lastDistrict && lastDistrict === district) continue; // district repeat -> collusion risk
    const workload = Math.max(0, Number(insp.workload) || 0);
    eligible.push({ insp, weight: 1 / (1 + workload) });
  }
  if (!eligible.length) {
    throw err(
      `no eligible inspector for district ${district}: all in cooling or served same district twice`,
      'CONFLICT',
    );
  }

  // weighted random, lower workload preferred
  const total = eligible.reduce((s, e) => s + e.weight, 0);
  let r = rand() * total;
  let picked = eligible[eligible.length - 1].insp;
  for (const e of eligible) {
    r -= e.weight;
    if (r <= 0) { picked = e.insp; break; }
  }

  const token = crypto.randomBytes(16).toString('hex'); // one-time, 32 hex
  const tokenHash = sha256(token);
  const start = now.toISOString();
  const end = new Date(now.getTime() + WINDOW_MS).toISOString(); // +48h surprise window
  const coolingUntil = new Date(now.getTime() + COOLING_MS).toISOString(); // 30d cooling
  return {
    inspectorId: String(picked.id),
    token,
    tokenHash,
    window: { start, end },
    facilityId: String(facilityId),
    district: String(district),
    coolingUntil,
  };
}

export function verifyToken(token, tokenHash) {
  if (!token || !tokenHash) throw err('token and tokenHash required', 'VALIDATION');
  const a = Buffer.from(sha256(token));
  const b = Buffer.from(String(tokenHash));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// tamper-evident hash-chained log: hash = sha256(prev + body), prev links chain
export function appendTamperLog({ actor, action, ...rest } = {}, file) {
  if (!actor || !action) throw err('actor and action required', 'VALIDATION');
  const f = logFile(file);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  let chain = [];
  try {
    if (fs.existsSync(f)) {
      const v = JSON.parse(fs.readFileSync(f, 'utf8'));
      if (Array.isArray(v)) chain = v;
    }
  } catch { chain = []; }
  const prev = chain.length ? chain[chain.length - 1].hash : GENESIS;
  const body = { ts: new Date().toISOString(), actor: String(actor), action: String(action), ...rest, prev };
  const hash = sha256(prev + JSON.stringify(body));
  const entry = { ...body, hash };
  chain.push(entry);
  const tmp = f + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(chain, null, 2));
  fs.renameSync(tmp, f);
  return entry;
}

// rotation log for UI: newest-last array, [] when no log yet
export function rotationLog(file) {
  try {
    const f = logFile(file);
    if (!fs.existsSync(f)) return [];
    const v = JSON.parse(fs.readFileSync(f, 'utf8'));
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

// tamper check: recompute every link; false on any gap, edit, or reorder
export function verifyTamperLog(file) {
  const chain = rotationLog(file);
  let prev = GENESIS;
  for (const e of chain) {
    if (!e || e.prev !== prev || !e.hash) return false;
    const { hash, ...body } = e;
    const a = Buffer.from(sha256(e.prev + JSON.stringify(body)));
    const b = Buffer.from(String(hash));
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
    prev = hash;
  }
  return true;
}

export default { draw, verifyToken, appendTamperLog, rotationLog, verifyTamperLog, LOG_FILE, COOLING_MS, WINDOW_MS };

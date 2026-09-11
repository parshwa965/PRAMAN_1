import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, '../../data/refresh.json');

export const ACCESS_TTL_S = 6 * 60 * 60;
export const REFRESH_TTL_S = 7 * 24 * 60 * 60;

const secret = () => process.env.AUTH_SECRET || 'dev-secret-change';

const b64uEncode = (buf) =>
  Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64uEncodeJson = (obj) => b64uEncode(JSON.stringify(obj));
const b64uDecodeJson = (s) => {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
};

const err = (message, code) => {
  const e = new Error(message);
  e.code = code;
  return e;
};

export const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');
export const hashDevice = (deviceId) => crypto.createHash('sha256').update(String(deviceId)).digest('hex');

// in-memory store: tokenHash -> { userId, deviceHash, exp }
const store = new Map();
let loaded = false;

function ensureDir() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
}

function load() {
  if (loaded) return;
  loaded = true;
  try {
    if (!fs.existsSync(DATA_FILE)) return;
    const arr = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    if (!Array.isArray(arr)) return;
    const now = Math.floor(Date.now() / 1000);
    for (const r of arr) {
      if (r && r.tokenHash && r.exp > now) store.set(r.tokenHash, r);
    }
  } catch { /* corrupt file -> start empty */ }
}

function persist() {
  ensureDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify([...store.entries()].map(([tokenHash, r]) => ({ tokenHash, ...r })), null, 2));
  try { fs.chmodSync(DATA_FILE, 0o600); } catch { /* non-posix */ }
}

function requireDevice(deviceId) {
  if (!deviceId || typeof deviceId !== 'string' || !deviceId.trim()) {
    throw err('x-device-id required', 'AUTH_REQUIRED');
  }
}

function signParts(header, payload) {
  const h = b64uEncodeJson(header);
  const p = b64uEncodeJson(payload);
  const sig = b64uEncode(crypto.createHmac('sha256', secret()).update(`${h}.${p}`).digest());
  return `${h}.${p}.${sig}`;
}

export function signAccess(payload = {}) {
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + ACCESS_TTL_S };
  return signParts({ alg: 'HS256', typ: 'JWT' }, body);
}

export function verifyAccess(token) {
  if (!token || typeof token !== 'string') throw err('missing token', 'AUTH_REQUIRED');
  const parts = token.split('.');
  if (parts.length !== 3) throw err('malformed token', 'AUTH_REQUIRED');
  const [h, p, s] = parts;
  let header;
  try { header = b64uDecodeJson(h); } catch { throw err('malformed token', 'AUTH_REQUIRED'); }
  if (header.alg !== 'HS256') throw err('bad algorithm', 'AUTH_REQUIRED');
  const expect = b64uEncode(crypto.createHmac('sha256', secret()).update(`${h}.${p}`).digest());
  const a = Buffer.from(expect);
  const b = Buffer.from(s);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw err('bad signature', 'AUTH_REQUIRED');
  let payload;
  try { payload = b64uDecodeJson(p); } catch { throw err('malformed token', 'AUTH_REQUIRED'); }
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) throw err('expired token', 'AUTH_REQUIRED');
  return payload;
}

export function issueRefresh(userId, deviceId) {
  if (!userId) throw err('userId required', 'AUTH_REQUIRED');
  requireDevice(deviceId);
  load();
  const token = crypto.randomBytes(32).toString('hex');
  const now = Math.floor(Date.now() / 1000);
  const rec = { userId: String(userId), deviceHash: hashDevice(deviceId), exp: now + REFRESH_TTL_S, createdAt: now };
  store.set(hashToken(token), rec);
  persist();
  return token;
}

export function rotateRefresh(oldToken, deviceId) {
  requireDevice(deviceId);
  if (!oldToken) throw err('refresh token required', 'AUTH_REQUIRED');
  load();
  const oldHash = hashToken(oldToken);
  const rec = store.get(oldHash);
  if (!rec) throw err('refresh reuse or unknown token', 'AUTH_REQUIRED');
  const now = Math.floor(Date.now() / 1000);
  store.delete(oldHash);
  if (rec.exp < now) {
    persist();
    throw err('refresh expired', 'AUTH_REQUIRED');
  }
  if (rec.deviceHash !== hashDevice(deviceId)) {
    persist();
    throw err('device mismatch', 'AUTH_REQUIRED');
  }
  const token = crypto.randomBytes(32).toString('hex');
  const next = { userId: rec.userId, deviceHash: rec.deviceHash, exp: now + REFRESH_TTL_S, createdAt: now };
  store.set(hashToken(token), next);
  persist();
  return { token, userId: rec.userId };
}

// test-only hook: clear memory (file untouched unless persisted)
export function _clear() {
  store.clear();
  loaded = true;
}

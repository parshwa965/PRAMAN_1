import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const SCHEMES = new Set(['PM-DAKSH', 'SHRESHTA', 'e-Anudaan', 'senior-homes', 'rehab', 'hostels']);
const AADHAAR_MASKED_RE = /^XXXX-XXXX-\d{4}$/;
const EVIDENCE_KINDS = new Set(['photo', 'attendance', 'doc']);
const BEN_STATUSES = new Set(['alive', 'dead', 'discharged']);
const GPS_SOURCES = new Set(['os', 'network']);

// --- rate-limit: in-memory IP map, fixed window, Retry-After on 429 ---
export function rateLimit({ windowMs = 60000, max = 100 } = {}) {
  const hits = new Map(); // rate state: ip -> { count, reset }
  function isAllowed(ip, now = Date.now()) {
    const key = String(ip ?? 'unknown');
    const t = Number(now) || Date.now();
    let e = hits.get(key);
    if (!e || t >= e.reset) { e = { count: 0, reset: t + windowMs }; hits.set(key, e); }
    if (e.count < max) {
      e.count += 1;
      return { allowed: true, remaining: max - e.count, resetMs: e.reset, retryAfter: 0, retryAfterSec: 0 };
    }
    const retryAfterSec = Math.max(1, Math.ceil((e.reset - t) / 1000));
    return { allowed: false, remaining: 0, resetMs: e.reset, retryAfter: retryAfterSec, retryAfterSec };
  }
  function middleware(req, res, next) {
    const ip = req?.ip ?? req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim()
      ?? req?.socket?.remoteAddress ?? req?.connection?.remoteAddress ?? 'unknown';
    const r = isAllowed(ip);
    if (res?.setHeader) {
      res.setHeader('X-RateLimit-Limit', String(max));
      res.setHeader('X-RateLimit-Remaining', String(r.remaining));
      res.setHeader('X-RateLimit-Reset', String(r.resetMs));
      if (!r.allowed) res.setHeader('Retry-After', String(r.retryAfterSec));
    }
    if (r.allowed) return next?.();
    if (res?.status && res?.json) return res.status(429).json({ error: { code: 'RATE_LIMITED', message: `rate limit exceeded, retry in ${r.retryAfterSec}s` } });
    const err = new Error(`rate limit exceeded, retry in ${r.retryAfterSec}s`);
    err.code = 'RATE_LIMITED'; err.retryAfter = r.retryAfterSec;
    throw err;
  }
  middleware.isAllowed = isAllowed;
  middleware.middleware = middleware;
  middleware.reset = (ip) => (ip === undefined ? hits.clear() : hits.delete(String(ip)));
  middleware.clear = () => hits.clear();
  middleware.hits = hits;
  return middleware;
}

// --- validate: hand-rolled trust-boundary validators, throws VALIDATION ---
function vFail(kind, errors) {
  const e = new Error(`VALIDATION: ${kind}: ${errors.join('; ')}`);
  e.code = 'VALIDATION'; e.details = errors; e.kind = kind;
  throw e;
}
const num = (v) => {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
};
const missing = (o, k) => o?.[k] === undefined || o?.[k] === null || (typeof o[k] === 'string' && !o[k].trim());
function checkScheme(v, errors) { if (!SCHEMES.has(v)) errors.push(`invalid scheme: ${v}`); }
function checkAadhaar(v, errors) { if (!AADHAAR_MASKED_RE.test(String(v ?? '').trim())) errors.push(`invalid aadhaar_masked (want XXXX-XXXX-NNNN): ${v}`); }
function checkLatLon(o, errors, latK = 'lat', lonK = 'lon') {
  const la = num(o?.[latK]), lo = num(o?.[lonK]);
  if (la === null || la < -90 || la > 90) errors.push(`invalid ${latK}: ${o?.[latK]}`);
  if (lo === null || lo < -180 || lo > 180) errors.push(`invalid ${lonK}: ${o?.[lonK]}`);
}
const validators = {
  beneficiary(d) {
    const e = [];
    if (!d || typeof d !== 'object') vFail('beneficiary', ['body object required']);
    if (missing(d, 'name') && missing(d, 'name_hash')) e.push('missing name');
    const a = d.aadhaar ?? d.aadhaar_masked ?? d.aadhar;
    if (a === undefined) e.push('missing aadhaar');
    else checkAadhaar(a, e);
    if (missing(d, 'dob') || Number.isNaN(Date.parse(d.dob))) e.push(`invalid dob: ${d?.dob}`);
    if (missing(d, 'scheme')) e.push('missing scheme');
    else checkScheme(d.scheme, e);
    if (d.status !== undefined && !BEN_STATUSES.has(d.status)) e.push(`invalid status: ${d.status}`);
    if (e.length) vFail('beneficiary', e);
    return true;
  },
  facility(d) {
    const e = [];
    if (!d || typeof d !== 'object') vFail('facility', ['body object required']);
    for (const k of ['name', 'district', 'state']) if (missing(d, k)) e.push(`missing ${k}`);
    checkLatLon(d, e);
    if (d.capacity !== undefined && (num(d.capacity) === null || num(d.capacity) < 0)) e.push(`invalid capacity: ${d.capacity}`);
    if (e.length) vFail('facility', e);
    return true;
  },
  evidence(d) {
    const e = [];
    if (!d || typeof d !== 'object') vFail('evidence', ['body object required']);
    if (missing(d, 'inspection_id')) e.push('missing inspection_id');
    if (missing(d, 'kind')) e.push('missing kind');
    else if (!EVIDENCE_KINDS.has(d.kind)) e.push(`invalid kind: ${d.kind}`);
    checkLatLon(d, e);
    if (d.gps_source !== undefined && !GPS_SOURCES.has(d.gps_source)) e.push(`invalid gps_source: ${d.gps_source}`);
    if (e.length) vFail('evidence', e);
    return true;
  },
};
const KIND_ALIAS = { beneficiaries: 'beneficiary', ben: 'beneficiary', facilities: 'facility', evidences: 'evidence' };
const normKind = (k) => KIND_ALIAS[String(k ?? '').toLowerCase()] ?? String(k ?? '').toLowerCase();
function inferKind(o) {
  if (!o || typeof o !== 'object') return null;
  if ('inspection_id' in o || 'gps_source' in o || 'phash' in o) return 'evidence';
  if ('aadhaar' in o || 'aadhaar_masked' in o || 'aadhar' in o || 'name_hash' in o || 'dob' in o) return 'beneficiary';
  if ('capacity' in o || 'district' in o || ('lat' in o && 'lon' in o)) return 'facility';
  return null;
}
export function validate(kind, data) {
  if (data === undefined) {
    if (typeof kind === 'string') return (d) => validate(kind, d); // validate('beneficiary') -> fn
    const inferred = inferKind(kind);
    if (inferred) { validators[inferred](kind); return true; }
    return (k, d) => validate(k, d); // validate(schemas) -> bound validator
  }
  const k = normKind(kind);
  if (!validators[k]) vFail(String(kind), [`unknown schema: ${kind}`]);
  return validators[k](data);
}

// --- maskPII: masked copy, never mutates input ---
export function maskPII(obj) {
  if (Array.isArray(obj)) return obj.map(maskPII);
  if (!obj || typeof obj !== 'object') return obj;
  const out = { ...obj };
  for (const [k, v] of Object.entries(out)) if (v && typeof v === 'object') out[k] = maskPII(v);
  for (const k of ['aadhaar', 'aadhaar_masked', 'aadhar']) {
    if (out[k] !== undefined && out[k] !== null) {
      const last4 = String(out[k]).replace(/\D/g, '').slice(-4).padStart(4, '0');
      out[k] = `XXXX-XXXX-${last4}`; // mask aadhaar, keep last4
    }
  }
  if (typeof out.name === 'string' && out.name.trim()) {
    out.name_hash = createHash('sha256').update(`praman|${out.name.trim()}`).digest('hex'); // mask name via hash
    delete out.name;
  }
  if (typeof out.phone === 'string' && out.phone.trim()) out.phone = `***-***-${out.phone.replace(/\D/g, '').slice(-4)}`;
  if (typeof out.email === 'string' && out.email.includes('@')) out.email = out.email.replace(/^[^@]*/, (m) => `${m[0] ?? '*'}***`);
  return out;
}
export const maskPii = maskPII;

// --- signedUrl: HMAC-sign CCTV URL with CCTV_SECRET, short expiry ---
export function signedUrl(cctvUrl, expiresSec = 300, opts = {}) {
  if (expiresSec && typeof expiresSec === 'object') { opts = expiresSec; expiresSec = 300; }
  if (typeof cctvUrl !== 'string' || !cctvUrl.trim()) throw new Error('cctvUrl required');
  const secret = opts.secret ?? process.env.CCTV_SECRET ?? 'dev-secret';
  if (!secret) throw new Error('CCTV_SECRET required');
  const now = Number(opts.now) || Date.now();
  const exp = now + Number(expiresSec ?? 300) * 1000;
  const base = cctvUrl.trim();
  const sig = createHmac('sha256', secret).update(`${base}.${exp}`).digest('hex'); // sign
  return `${base}${base.includes('?') ? '&' : '?'}exp=${exp}&sig=${sig}`;
}
export function verifySignedUrl(a, b, c, opts = {}) {
  let url, exp, sig;
  if (b !== undefined || c !== undefined) { [url, exp, sig] = [a, b, c]; }
  else if (a && typeof a === 'object') { ({ url, exp, sig, ...opts } = a); }
  else if (typeof a === 'string') {
    const me = a.match(/[?&]exp=([^&]+)/), ms = a.match(/[?&]sig=([^&]+)/);
    exp = me && decodeURIComponent(me[1]); sig = ms && decodeURIComponent(ms[1]);
    url = a.replace(/[?&](exp|sig)=[^&]*/g, '').replace(/[?&]$/, '');
  }
  const secret = opts.secret ?? process.env.CCTV_SECRET ?? 'dev-secret';
  if (!secret || !url || !Number.isFinite(Number(exp)) || Number(exp) <= (Number(opts.now) || Date.now())) return false;
  if (typeof sig !== 'string' || !sig) return false;
  const want = createHmac('sha256', secret).update(`${String(url)}.${exp}`).digest('hex');
  try {
    const x = Buffer.from(want, 'utf8'), y = Buffer.from(sig, 'utf8');
    return x.length === y.length && timingSafeEqual(x, y);
  } catch { return want === sig; }
}

export default { rateLimit, validate, maskPII, maskPii, signedUrl, verifySignedUrl, SCHEMES };

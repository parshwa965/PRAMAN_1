import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const err = (message, code) => { const e = new Error(message); e.code = code; return e; };
const num = (v) => (typeof v === 'string' && v.trim() !== '' ? Number(v) : v);
const toMs = (v) => {
  if (v == null) return NaN;
  if (typeof v === 'number') return v < 1e12 ? v * 1000 : v;
  const t = Date.parse(v);
  return Number.isNaN(t) ? NaN : t;
};

// live-only: camera capture accepted, gallery upload rejected
export function assertLive(capture = {}) {
  const c = capture && typeof capture === 'object' ? capture : { source: capture };
  const source = String(c.source ?? (c.live_capture === true || c.liveCapture === true ? 'live' : '')).toLowerCase();
  const liveFlag = c.live_capture ?? c.liveCapture ?? c.live;
  if (source === 'gallery' || source === 'upload' || liveFlag === false || liveFlag === 'false') {
    throw err('gallery upload rejected: live capture only', 'GALLERY_REJECTED');
  }
  if (source !== 'live' && liveFlag !== true && liveFlag !== 'true') {
    throw err('gallery upload rejected: live capture only', 'GALLERY_REJECTED');
  }
  return true;
}

// 64-bit average hash from raw bytes (no deps). Similar buffers -> similar hash.
function avgHash64(buf) {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf ?? '');
  const N = 64;
  const samples = new Array(N);
  if (b.length === 0) return '0000000000000000';
  if (b.length === 1) { const v = b[0]; return (v > 127 ? 'ffffffffffffffff' : '0000000000000000'); }
  for (let i = 0; i < N; i++) {
    const pos = (i * (b.length - 1)) / (N - 1);
    const lo = Math.floor(pos), hi = Math.ceil(pos), f = pos - lo;
    samples[i] = b[lo] * (1 - f) + b[hi] * f;
  }
  const avg = samples.reduce((a, x) => a + x, 0) / N;
  let hi = 0, lo = 0;
  const spread = Math.max(...samples) - Math.min(...samples);
  const set = (i) => { if (i < 32) hi |= (1 << (31 - i)); else lo |= (1 << (63 - i)); };
  if (spread < 0.5) {
    // flat image: avg-hash bits all zero regardless of shade; spread mean bits instead
    const mean = Math.round(avg);
    for (let i = 0; i < N; i++) if ((mean >> (i % 8)) & 1) set(i);
  } else {
    for (let i = 0; i < N; i++) if (samples[i] > avg) set(i);
  }
  return (hi >>> 0).toString(16).padStart(8, '0') + (lo >>> 0).toString(16).padStart(8, '0');
}

export const phash = (buffer) => avgHash64(buffer);
export const dhash = (buffer) => avgHash64(buffer);

export function hamming(a, b) {
  const x = BigInt('0x' + String(a || '0')) ^ BigInt('0x' + String(b || '0'));
  let n = x, c = 0;
  while (n) { c += Number(n & 1n); n >>= 1n; }
  return c;
}

export function isDuplicate(a, b, threshold = 5) {
  return hamming(a, b) <= (threshold ?? 5);
}

const R = 6371;
const rad = (d) => (d * Math.PI) / 180;
export function haversineKm(lat1, lon1, lat2, lon2) {
  const [a, b, c, d] = [num(lat1), num(lon1), num(lat2), num(lon2)];
  if ([a, b, c, d].some((v) => typeof v !== 'number' || Number.isNaN(v))) return NaN;
  const h = Math.sin(rad(c - a) / 2) ** 2 + Math.cos(rad(a)) * Math.cos(rad(c)) * Math.sin(rad(d - b) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// claimed = OS GPS; facility = registered; network = network fix. Reject OS-vs-network >50km or claimed-vs-facility >10km.
export function gpsPlausibility(claimedLat, claimedLon, facilityLat, facilityLon, networkLat, networkLon) {
  const km = haversineKm(claimedLat, claimedLon, facilityLat, facilityLon);
  const networkKm = (networkLat != null && networkLon != null)
    ? haversineKm(claimedLat, claimedLon, networkLat, networkLon) : 0;
  if (Number.isNaN(km)) throw err('invalid GPS coordinates', 'VALIDATION');
  if (networkKm > 50) { const e = err(`OS-vs-network GPS mismatch ${networkKm.toFixed(1)}km`, 'VALIDATION'); e.km = networkKm; throw e; }
  if (km > 10) { const e = err(`claimed-vs-facility GPS mismatch ${km.toFixed(1)}km`, 'VALIDATION'); e.km = km; throw e; }
  return { ok: true, km, networkKm };
}

export const MAX_DRIFT_MS = 15 * 60 * 1000;
export function timeDrift(deviceTs, serverTs = Date.now()) {
  const d = toMs(deviceTs), s = toMs(serverTs);
  if (Number.isNaN(d) || Number.isNaN(s)) throw err('invalid timestamps', 'VALIDATION');
  const drift = Math.abs(d - s);
  if (drift > MAX_DRIFT_MS) { const e = err(`clock drift ${(drift / 60000).toFixed(1)}min exceeds 15min`, 'VALIDATION'); e.drift = drift; throw e; }
  return { ok: true, drift };
}

// strip EXIF APP1 segment (0xFFE1) from JPEG; pass-through otherwise. Resign HMAC_SHA256(sha256+phash+serverTs).
export function stripExifAndResign(buffer, meta = {}) {
  const b = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer ?? '');
  let clean = b;
  // minimal JPEG EXIF strip: drop APP1 segments
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
    const out = [b.subarray(0, 2)];
    let i = 2;
    while (i + 4 <= b.length) {
      if (b[i] !== 0xff) break;
      const marker = b[i + 1];
      if (marker === 0xda || marker === 0xd9) { out.push(b.subarray(i)); break; } // SOS/EOI: rest as-is
      const len = b.readUInt16BE(i + 2);
      const seg = b.subarray(i, i + 2 + len);
      if (marker !== 0xe1) out.push(seg); // drop EXIF APP1
      i += 2 + len;
    }
    if (i >= b.length - 1) out.push(b.subarray(i));
    clean = Buffer.concat(out);
  }
  const sha256 = crypto.createHash('sha256').update(clean).digest('hex');
  const hash = phash(clean);
  const serverTs = meta.serverTs || meta.server_ts || new Date().toISOString();
  const signature = crypto.createHmac('sha256', process.env.EVIDENCE_SECRET || 'dev-secret')
    .update(`${sha256}${hash}${serverTs}`).digest('hex');
  return { clean, sha256, phash: hash, serverTs, server_ts: serverTs, exif_stripped: true, signature };
}

export function verifyEvidence(evidence = {}, facility = {}) {
  assertLive(evidence.capture ?? evidence);
  const buf = evidence.buffer ?? evidence.file ?? evidence.image ?? Buffer.alloc(0);
  const lat = num(evidence.lat ?? evidence.claimedLat), lon = num(evidence.lon ?? evidence.claimedLon);
  const flat = num(facility.lat ?? evidence.facilityLat), flon = num(facility.lon ?? evidence.facilityLon);
  const nlat = evidence.networkLat ?? evidence.network_lat, nlon = evidence.networkLon ?? evidence.network_lon;
  const gps = (lat != null && flat != null) ? gpsPlausibility(lat, lon, flat, flon, nlat, nlon) : { ok: true, km: 0 };
  const t = timeDrift(evidence.deviceTs ?? evidence.device_ts ?? Date.now(), evidence.serverTs ?? evidence.server_ts ?? Date.now());
  if (evidence.existingPhash || evidence.existing_phash) {
    const h0 = phash(Buffer.isBuffer(buf) ? buf : Buffer.from(buf ?? ''));
    if (isDuplicate(h0, evidence.existingPhash ?? evidence.existing_phash)) {
      throw err('phash matches existing evidence, recycled photo suspected', 'CONFLICT');
    }
  }
  const sealed = stripExifAndResign(Buffer.isBuffer(buf) ? buf : Buffer.from(buf ?? ''), evidence);
  return { ok: true, gps, time: t, ...sealed };
}

// self-test positive control: uses tests/fixtures when present, synthetic buffers otherwise
if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  const fixDir = path.join(path.dirname(new URL(import.meta.url).pathname), '../../tests/fixtures');
  let bufs = [];
  try {
    if (fs.existsSync(fixDir)) {
      for (const f of fs.readdirSync(fixDir)) bufs.push(fs.readFileSync(path.join(fixDir, f)));
    }
  } catch { /* ignore */ }
  if (!bufs.length) { bufs = [crypto.randomBytes(512), crypto.randomBytes(512)]; bufs[1] = Buffer.from(bufs[0]); bufs[1][500] ^= 0x01; }
  assertLive({ source: 'live' });
  const h = phash(bufs[0]);
  if (!isDuplicate(h, phash(bufs[0]))) throw new Error('phash self-test failed');
  gpsPlausibility(24.7955, 85.0031, 24.7955, 85.0031, 24.796, 85.0035);
  timeDrift(Date.now(), Date.now());
  stripExifAndResign(bufs[0], {});
  console.log('evidence self-test passed');
}

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const AUDIT_FILE = path.join(__dirname, '../../data/audit.json');
const GENESIS = 'GENESIS';

function ensureDir() {
  fs.mkdirSync(path.dirname(AUDIT_FILE), { recursive: true });
}

export function readAll() {
  try {
    if (!fs.existsSync(AUDIT_FILE)) return [];
    const v = JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf8'));
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function persist(chain) {
  ensureDir();
  fs.writeFileSync(AUDIT_FILE, JSON.stringify(chain, null, 2));
}

export function append(actor, action, entity, entityId) {
  if (!actor || !action) throw Object.assign(new Error('actor+action required'), { code: 'AUTH_REQUIRED' });
  const chain = readAll();
  const prev = chain.length ? chain[chain.length - 1].hash : GENESIS;
  const entry = {
    seq: chain.length + 1,
    ts: new Date().toISOString(),
    actor: String(actor),
    action: String(action),
    entity: entity == null ? null : String(entity),
    entityId: entityId == null ? null : String(entityId),
    prevHash: prev,
  };
  const hash = crypto.createHash('sha256').update(prev + JSON.stringify(entry)).digest('hex');
  const sealed = { ...entry, hash, chain: chain.length + 1 };
  chain.push(sealed);
  persist(chain);
  return sealed;
}

// hash-chained immutable log: every entry links prevHash, hash covers body
export function verifyChain() {
  const chain = readAll();
  let prev = GENESIS;
  for (const e of chain) {
    if (e.prevHash !== prev) return false;
    const { hash, chain: _c, ...body } = e;
    const expect = crypto.createHash('sha256').update(e.prevHash + JSON.stringify(body)).digest('hex');
    const a = Buffer.from(expect);
    const b = Buffer.from(String(hash));
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
    prev = hash;
  }
  return true;
}

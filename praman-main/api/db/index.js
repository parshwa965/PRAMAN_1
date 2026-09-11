import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = process.env.PRAMAN_DATA_DIR ?? path.join(here, 'data');
export const TABLES = ['beneficiary', 'facility', 'grant', 'inspection', 'evidence', 'assignment', 'vc_log', 'audit_log'];

const SCHEMES = new Set(['PM-DAKSH', 'SHRESHTA', 'e-Anudaan', 'senior-homes', 'rehab', 'hostels']);
const ENUMS = {
  beneficiary: { status: new Set(['alive', 'dead', 'discharged']) },
  grant: { stage: new Set(['sanctioned', 'released', 'mid', 'complete']) },
  inspection: { status: new Set(['scheduled', 'open', 'submitted', 'verified', 'flagged']) },
  evidence: { kind: new Set(['photo', 'attendance', 'doc']), gps_source: new Set(['os', 'network']) },
  vc_log: { outcome: new Set(['completed', 'missed', 'rejected', 'scheduled']) },
};

function assertTable(t) {
  if (!TABLES.includes(t)) throw new Error('unknown table: ' + t);
  return t;
}

function fileFor(table, dir = DATA_DIR) {
  return path.join(dir, assertTable(table) + '.json');
}

function checkEnums(table, row) {
  const rules = ENUMS[table];
  if (!rules) return;
  for (const [k, set] of Object.entries(rules)) {
    if (row[k] !== undefined && row[k] !== null && !set.has(row[k])) throw new Error(`invalid ${table}.${k}: ${row[k]}`);
  }
  if ((table === 'beneficiary' || table === 'grant') && row.scheme !== undefined && !SCHEMES.has(row.scheme)) {
    throw new Error(`invalid ${table}.scheme: ${row.scheme}`);
  }
}

export function load(table, dir = DATA_DIR) {
  const f = fileFor(table, dir);
  if (!fs.existsSync(f)) return [];
  const rows = JSON.parse(fs.readFileSync(f, 'utf8'));
  if (!Array.isArray(rows)) throw new Error('corrupt store: ' + f);
  return rows;
}

export function save(table, rows, dir = DATA_DIR) {
  assertTable(table);
  if (!Array.isArray(rows)) throw new Error('rows must be an array');
  fs.mkdirSync(dir, { recursive: true });
  const f = fileFor(table, dir);
  const tmp = f + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(rows, null, 2));
  fs.renameSync(tmp, f);
  return rows.length;
}

export const all = load;
export function get(table, id, dir = DATA_DIR) {
  return load(table, dir).find((r) => r?.id === id) ?? null;
}
export function insert(table, row, dir = DATA_DIR) {
  assertTable(table);
  if (!row || typeof row !== 'object') throw new Error('row object required');
  if (typeof row.id !== 'string' || !row.id.trim()) throw new Error('row.id required');
  checkEnums(table, row);
  const rows = load(table, dir);
  if (rows.some((r) => r?.id === row.id)) throw new Error(`duplicate ${table}: ${row.id}`);
  rows.push({ ...row });
  save(table, rows, dir);
  return { ...row };
}
export function update(table, id, patch, dir = DATA_DIR) {
  assertTable(table);
  if (!patch || typeof patch !== 'object') throw new Error('patch object required');
  checkEnums(table, patch);
  const rows = load(table, dir);
  const i = rows.findIndex((r) => r?.id === id);
  if (i < 0) throw new Error(`not found ${table}: ${id}`);
  rows[i] = { ...rows[i], ...patch, id };
  save(table, rows, dir);
  return { ...rows[i] };
}
export function remove(table, id, dir = DATA_DIR) {
  const rows = load(assertTable(table), dir);
  const next = rows.filter((r) => r?.id !== id);
  if (next.length === rows.length) return false;
  save(table, next, dir);
  return true;
}
export function query(table, filter, dir = DATA_DIR) {
  const rows = load(table, dir);
  if (typeof filter === 'function') return rows.filter(filter);
  if (!filter || typeof filter !== 'object') return rows;
  return rows.filter((r) => Object.entries(filter).every(([k, v]) => r?.[k] === v));
}
export function count(table, dir = DATA_DIR) {
  return load(table, dir).length;
}
export function clear(table, dir = DATA_DIR) {
  return save(table, [], dir);
}

// Per-table helper: db.beneficiaries.all() etc. One factory, no 40 hand-written wrappers.
export function collection(table) {
  assertTable(table);
  return {
    all: (dir) => load(table, dir),
    get: (id, dir) => get(table, id, dir),
    insert: (row, dir) => insert(table, row, dir),
    update: (id, patch, dir) => update(table, id, patch, dir),
    remove: (id, dir) => remove(table, id, dir),
    query: (filter, dir) => query(table, filter, dir),
    count: (dir) => count(table, dir),
    clear: (dir) => clear(table, dir),
  };
}

export const beneficiaries = collection('beneficiary');
export const facilities = collection('facility');
export const grants = collection('grant');
export const inspections = collection('inspection');
export const evidences = collection('evidence');
export const assignments = collection('assignment');
export const vcLog = collection('vc_log');
export const auditLog = collection('audit_log');

export default { DATA_DIR, TABLES, load, save, all, get, insert, update, remove, query, count, clear, collection };

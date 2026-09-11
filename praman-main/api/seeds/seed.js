import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { save } from '../db/index.js';

// Deterministic LCG so seed output is stable across runs.
const lcg = (s) => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const pick = (r, a) => a[Math.floor(r() * a.length)];
const hash = (s) => crypto.createHash('sha256').update(s).digest('hex');

const FIRST = ['Aarav', 'Meera', 'Ravi', 'Sunita', 'Vikram', 'Anita', 'Ramesh', 'Kavita', 'Suresh', 'Priya', 'Amit', 'Geeta', 'Mohan', 'Lakshmi', 'Arjun'];
const LAST = ['Sharma', 'Verma', 'Yadav', 'Devi', 'Kumar', 'Singh', 'Nair', 'Menon', 'Gupta', 'Mishra', 'Das', 'Patel'];

export const FACILITIES = [
  { id: 'FAC-KL-01', name: 'Thrissur Senior Home', district: 'Thrissur', state: 'Kerala', type: 'senior-home', lat: 10.5276, lon: 76.2144, capacity: 100 },
  { id: 'FAC-BR-01', name: 'Gaya Rehab Centre', district: 'Gaya', state: 'Bihar', type: 'rehab', lat: 24.7914, lon: 85.0002, capacity: 80 },
  { id: 'FAC-MP-01', name: 'Bhopal Skilling Centre', district: 'Bhopal', state: 'Madhya Pradesh', type: 'skilling', lat: 23.2599, lon: 77.4126, capacity: 200 },
  { id: 'FAC-RJ-01', name: 'Jaipur SHRESHTA Hostel', district: 'Jaipur', state: 'Rajasthan', type: 'hostel', lat: 26.9124, lon: 75.7873, capacity: 150 },
  { id: 'FAC-UP-01', name: 'Lucknow Hostel', district: 'Lucknow', state: 'Uttar Pradesh', type: 'hostel', lat: 26.8467, lon: 80.9462, capacity: 150 },
  { id: 'FAC-DL-01', name: 'South Delhi NGO Hub', district: 'South Delhi', state: 'Delhi', type: 'ngo-hub', lat: 28.52, lon: 77.2, capacity: 120 },
];

const SCHEMES = ['PM-DAKSH', 'SHRESHTA', 'e-Anudaan', 'senior-homes', 'rehab', 'hostels'];
const SCHEME_FACILITY = { 'PM-DAKSH': 'FAC-MP-01', SHRESHTA: 'FAC-RJ-01', 'e-Anudaan': 'FAC-DL-01', 'senior-homes': 'FAC-KL-01', rehab: 'FAC-BR-01', hostels: 'FAC-UP-01' };

export function buildSeed() {
  const r = lcg(20240909);
  const beneficiaries = Array.from({ length: 40 }, (_, i) => {
    const n = i + 1;
    const scheme = SCHEMES[i % SCHEMES.length];
    const name = `${pick(r, FIRST)} ${pick(r, LAST)}`;
    return {
      id: `BEN-${String(n).padStart(3, '0')}`,
      name_hash: hash(`praman-beneficiary-${n}-${name}`),
      aadhaar_masked: `XXXX-XXXX-${String(1000 + n)}`,
      dob: `${1945 + Math.floor(r() * 60)}-${String(1 + Math.floor(r() * 12)).padStart(2, '0')}-${String(1 + Math.floor(r() * 28)).padStart(2, '0')}`,
      scheme,
      facility_id: SCHEME_FACILITY[scheme],
      status: n === 39 ? 'dead' : n === 40 ? 'discharged' : 'alive',
      face_hash: n >= 39 ? null : hash(`praman-face-${n}`).slice(0, 32),
    };
  });
  const grants = FACILITIES.map((f, i) => {
    const sanctioned = [5000000, 3200000, 8000000, 4500000, 4500000, 2500000][i];
    const released = Math.round(sanctioned * [0.8, 0.75, 0.9, 0.6, 1, 0.5][i]);
    return {
      id: `GRT-0${i + 1}`,
      facility_id: f.id,
      scheme: ['senior-homes', 'rehab', 'PM-DAKSH', 'SHRESHTA', 'hostels', 'e-Anudaan'][i],
      sanctioned,
      released,
      utilized: Math.round(released * [0.7, 0.9, 0.55, 0.4, 0.85, 0.3][i]),
      stage: ['mid', 'released', 'mid', 'released', 'complete', 'sanctioned'][i],
    };
  });
  const inspections = [
    { id: 'INS-01', facility_id: 'FAC-MP-01', inspector_id: 'INSP-001', token: hash('praman-ins-01').slice(0, 16), window_start: '2024-04-01T09:00:00Z', window_end: '2024-04-01T17:00:00Z', status: 'submitted', created_at: '2024-03-28T10:00:00Z' },
    { id: 'INS-02', facility_id: 'FAC-BR-01', inspector_id: 'INSP-002', token: hash('praman-ins-02').slice(0, 16), window_start: '2024-04-08T09:00:00Z', window_end: '2024-04-08T17:00:00Z', status: 'scheduled', created_at: '2024-04-02T10:00:00Z' },
  ];
  return { facility: FACILITIES, beneficiary: beneficiaries, grant: grants, inspection: inspections };
}

export function seed(dir) {
  const data = buildSeed();
  for (const [table, rows] of Object.entries(data)) save(table, rows, dir);
  return Object.fromEntries(Object.entries(data).map(([t, rows]) => [t, rows.length]));
}

const here = path.dirname(fileURLToPath(import.meta.url));
const direct = process.argv[1] ? path.resolve(process.argv[1]) === path.resolve(here + '/seed.js') : false;
if (direct) console.log('seed done', JSON.stringify(seed()));
export default { seed, buildSeed, FACILITIES };

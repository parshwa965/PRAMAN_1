import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gpsPlausibility } from '../../api/evidence/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const spoof = JSON.parse(fs.readFileSync(path.join(__dirname, '../fixtures/spoof-case.json'), 'utf8'));
try {
  const ev = spoof.evidence, fac = spoof.facility; // spoof: Mumbai GPS vs Bihar facility
  assert.throws(() => gpsPlausibility(ev.lat, ev.lon, fac.lat, fac.lon), (e) => e.code === 'VALIDATION' && e.km > 10, 'spoofed GPS must be rejected');
  console.log('gps-spoof verification passed');
} catch (e) { console.error('FAIL spoof:', e.message); process.exit(1); }

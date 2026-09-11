import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { headcountAnomaly } from '../../api/anomaly/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ghost = JSON.parse(fs.readFileSync(path.join(__dirname, '../fixtures/ghost-case.json'), 'utf8'));
try {
  const attendance = ghost.attendance ?? [];
  const claimed = attendance.length; // 12 claims
  const faces = new Set(attendance.map((a) => a.face_hash));
  const actual = [...faces]; // 1 unique face -> proxy attendance
  const r = headcountAnomaly(claimed, actual);
  assert.equal(faces.size, 1, 'expected single proxy face_hash');
  assert.equal(claimed, 12, 'expected 12 ghost claims');
  assert.equal(r.flagged, true, 'headcount must flag proxy attendance');
  assert.equal(r.type, 'headcount');
  console.log('proxy verification passed');
} catch (e) { console.error('FAIL proxy:', e.message); process.exit(1); }

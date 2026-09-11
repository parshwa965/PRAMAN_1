import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findDuplicates } from '../../api/anomaly/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pair = JSON.parse(fs.readFileSync(path.join(__dirname, '../fixtures/evidence-pair.json'), 'utf8'));
try {
  const dups = findDuplicates([pair.a, pair.b]); // same phash recycled across years
  assert.ok(dups.length > 0, 'recycled photo must be flagged');
  assert.equal(dups[0].duplicate, true);
  assert.equal(dups[0].distance, 0);
  console.log('recycled verification passed');
} catch (e) { console.error('FAIL recycled:', e.message); process.exit(1); }

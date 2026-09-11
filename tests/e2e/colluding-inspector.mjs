import assert from 'node:assert';
import { draw } from '../../api/assignment/index.js';

// colluding inspector: same inspector must not serve same district twice
try {
  const inspectors = [{ id: 'INS-COLLU-01', district: 'Patna', workload: 0 }];
  const first = draw({ facilityId: 'FAC-BR-01', district: 'Gaya', inspectors, history: [] });
  assert.ok(first.inspectorId);
  const history = [{ inspectorId: first.inspectorId, district: 'Gaya', ts: new Date().toISOString() }];
  let err = null;
  try { draw({ facilityId: 'FAC-BR-01', district: 'Gaya', inspectors, history }); } catch (e) { err = e; }
  assert.ok(err && err.code === 'CONFLICT', 'colluding repeat assignment must throw CONFLICT');
  console.log('collude verification passed');
} catch (e) { console.error('FAIL collude:', e.message); process.exit(1); }

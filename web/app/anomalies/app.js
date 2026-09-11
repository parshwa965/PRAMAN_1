import { getAnomalies } from '../../lib/api.js';
import { getRole } from '../../lib/guards.js';

const BASE = 'http://localhost:3001/api';
const $ = (id) => document.getElementById(id);

// Fallback demo anomalies when API offline: one per inbox filter.
const DEMO = [
  { id: 'an-11', type: 'duplicate', score: 0.97, facility_id: 'fac-012', detail: 'recycled photo: phash match ev-900 (2024) vs ev-812 (2023), same classroom wall', evidence_ids: ['ev-900', 'ev-812'] },
  { id: 'an-12', type: 'duplicate', score: 0.94, facility_id: 'fac-021', detail: 'ghost beneficiary: face_hash match ben-204/ben-311 claimed twice under PM-DAKSH', evidence_ids: ['ev-901'] },
  { id: 'an-13', type: 'headcount', score: 0.88, facility_id: 'fac-033', detail: 'GPS jump Mumbai (19.07,72.87) to Bihar (25.59,85.13) within 40 min, attendance capture suspect', evidence_ids: ['ev-902'] },
  { id: 'an-14', type: 'mortality', score: 0.91, facility_id: 'fac-045', detail: 'alive-status claim for ben-118 vs dead registry entry 2025-11-02', evidence_ids: ['ev-903'] },
  { id: 'an-15', type: 'heartbeat', score: 0.83, facility_id: 'fac-077', detail: 'CCTV silence 31h, monitor visit due', evidence_ids: [] },
  { id: 'an-31', type: 'fund-gap', score: 0.91, facility_id: 'fac-040', detail: 'fund gap: released 100% (48.0L) vs utilized 20% (9.6L) at stage complete, BOQ photo missing', evidence_ids: [] },
];

let items = [];
let filter = 'all';

function evLink(a) {
  if (!a.evidence_ids || !a.evidence_ids.length) return '—';
  return a.evidence_ids.map((id) => `<a href="../evidence/page.html?evidence=${encodeURIComponent(id)}">${id}</a>`).join(' ');
}

export function applyFilter(list, f) {
  return f === 'all' ? list : list.filter((a) => a.type === f);
}

export function render(list) {
  const rows = applyFilter(list, filter);
  $('rows').innerHTML = rows.map((a) => `<tr data-id="${a.id}">
    <td class="score">${Number(a.score).toFixed(2)}</td>
    <td>${a.type}</td><td>${a.facility_id}</td><td>${a.detail}</td>
    <td>${evLink(a)}</td>
    <td><button class="rowbtn" data-act="verify">Verify</button><button class="rowbtn" data-act="dismiss">Dismiss</button></td>
  </tr>`).join('') || '<tr><td colspan="6">No anomalies in this bucket.</td></tr>';
  $('count').textContent = rows.length + ' shown / ' + list.length + ' anomalies';
  document.querySelectorAll('.tabs button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === filter)));
}

async function resolve(id, verdict) {
  const token = localStorage.getItem('praman_jwt') || '';
  try {
    const res = await fetch(`${BASE}/anomalies/${encodeURIComponent(id)}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: JSON.stringify({ verdict, note: verdict + ' from inbox' }),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
  } catch { /* offline: drop locally */ }
  items = items.filter((a) => a.id !== id);
  render(items);
  $('status').textContent = id + ' ' + (verdict === 'confirmed' ? 'verified' : 'dismissed') + '.';
}

export async function load() {
  try {
    const body = await getAnomalies({ limit: 50 });
    items = body.items || [];
    $('status').textContent = items.length ? '' : 'No open anomalies.';
  } catch {
    items = DEMO; // ponytail: static fallback, live GET /anomalies when API up
    $('status').textContent = 'API offline — demo anomalies.';
  }
  render(items);
}

if (typeof document !== 'undefined') {
document.querySelector('.tabs').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-filter]');
  if (b) { filter = b.dataset.filter; render(items); }
});
$('rows').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-act]');
  if (!b) return;
  const r = getRole();
  if (r !== 'Dept' && r !== 'PMU') { $('status').textContent = 'FORBIDDEN: Dept or PMU required, got ' + r; return; }
  resolve(b.closest('tr').dataset.id, b.dataset.act === 'verify' ? 'confirmed' : 'dismissed');
});

$('role').textContent = getRole();
load();
}

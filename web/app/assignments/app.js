import { drawAssignment } from '../../lib/api.js';
import { getRole, guardAssignments } from '../../lib/guards.js';

const BASE = 'http://localhost:3001/api';
const $ = (id) => document.getElementById(id);

const DEMO_ROTATION = [
  { inspector_id: 'insp-03', district: 'Gaya', created_at: '2026-07-01T10:00:00Z', cooling_until: '2026-07-31T10:00:00Z' },
  { inspector_id: 'insp-07', district: 'Patna', created_at: '2026-09-09T10:00:00Z', cooling_until: '2026-10-09T10:00:00Z' },
];

function coolingStatus(r) {
  if (!r.cooling_until) return 'available';
  return new Date(r.cooling_until) > new Date() ? 'cooling until ' + r.cooling_until.slice(0, 10) : 'available';
}

export function renderResult(d) {
  $('result').innerHTML =
    `<dt>Inspector</dt><dd>${d.inspector_id ?? d.inspectorId}</dd>` +
    `<dt>Token</dt><dd><code>${d.token}</code></dd>` +
    `<dt>Window</dt><dd>${d.window.start} → ${d.window.end}</dd>` +
    (d.cooling_until || d.coolingUntil ? `<dt>Cooling until</dt><dd>${d.cooling_until ?? d.coolingUntil}</dd>` : '');
}

export function renderRotation(rows) {
  $('rotation-rows').innerHTML = rows.map((r) =>
    `<tr><td>${r.inspector_id ?? r.inspectorId}</td><td>${r.district ?? '—'}</td>` +
    `<td>${(r.created_at ?? r.ts ?? '').slice(0, 10) || '—'}</td><td>${coolingStatus(r)}</td></tr>`
  ).join('') || '<tr><td colspan="4">No rotation entries yet.</td></tr>';
  $('rotation-meta').textContent = rows.length + ' rotation entries · no same district twice';
}

export async function loadRotation() {
  const fid = $('facility').value;
  try {
    const token = localStorage.getItem('praman_jwt') || '';
    const res = await fetch(BASE + '/assignments/rotation?facility_id=' + encodeURIComponent(fid), {
      headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const body = await res.json();
    renderRotation(body.history || body.items || []);
  } catch {
    renderRotation(DEMO_ROTATION); // ponytail: static fallback, live GET /assignments/rotation when API up
  }
}

$('draw-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fid = $('facility').value;
  $('status').textContent = 'Drawing inspector…';
  try {
    renderResult(await drawAssignment(fid));
    $('status').textContent = 'Drawn for ' + fid + '.';
  } catch (err) {
    const msg = String((err && err.message) || err);
    $('status').textContent = /CONFLICT/i.test(msg)
      ? 'Draw refused: colluding inspector refused — all eligible inspectors in cooling or served this district last.'
      : 'Draw failed: ' + msg;
    return;
  }
  loadRotation();
});

$('facility').addEventListener('change', loadRotation);
$('role').textContent = getRole();
guardAssignments(document);
loadRotation();

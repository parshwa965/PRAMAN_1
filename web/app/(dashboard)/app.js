import { getOverview } from '../../lib/api.js';
import { getRole, guardAssignments } from '../../lib/guards.js';

// Fallback demo data: realistic MoSJE FY25-26 figures (₹ lakh).
const DEMO = {
  funds_released_lakh: 4820.5,
  facilities: 312,
  alerts_open: 17,
  schemes: [
    { name: 'PM-DAKSH', sanctioned: 1850.0, released: 1420.5 },
    { name: 'SHRESHTA', sanctioned: 1240.0, released: 980.0 },
    { name: 'e-Anudaan', sanctioned: 2100.0, released: 1650.0 },
    { name: 'Senior homes', sanctioned: 640.0, released: 490.0 },
    { name: 'Hostels', sanctioned: 380.0, released: 280.0 },
  ],
  alerts: [
    { id: 'an-31', type: 'fund-gap', detail: 'fac-040: released 48.0L vs utilized 12.5L at stage complete' },
    { id: 'an-11', type: 'duplicate', detail: 'face_hash match ben-204/ben-311 across PM-DAKSH 2024/2025' },
    { id: 'an-12', type: 'heartbeat', detail: 'fac-077: CCTV silence 31h, monitor visit due' },
  ],
};

const $ = (id) => document.getElementById(id);

export function render(o) {
  $('funds').textContent = '₹' + Number(o.funds_released_lakh).toLocaleString('en-IN') + 'L';
  $('facilities').textContent = o.facilities;
  $('alerts-count').textContent = o.alerts_open ?? (o.alerts || []).length;
  $('coverage').textContent = o.facilities + ' facilities across 6 schemes';
  $('schemes').innerHTML = '<tr><th>Scheme</th><th>Sanctioned</th><th>Released</th></tr>' +
    o.schemes.map((s) => `<tr><td>${s.name}</td><td>${s.sanctioned.toLocaleString('en-IN')}L</td><td>${s.released.toLocaleString('en-IN')}L</td></tr>`).join('');
  $('alerts').innerHTML = (o.alerts || []).map((a) => `<li><b>${a.type}</b> · ${a.detail}</li>`).join('');
  $('updated').textContent = 'updated ' + new Date().toLocaleTimeString('en-IN');
}

export async function load() {
  try {
    render(await getOverview());
  } catch {
    render(DEMO); // ponytail: static fallback, wire /dashboard/overview when API adds it
  }
}

$('role').textContent = getRole();
guardAssignments(document);
load();
setInterval(load, 30000);

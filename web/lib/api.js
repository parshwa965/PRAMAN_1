const BASE = 'http://localhost:3001/api';

function authHeaders(extra = {}) {
  const token = localStorage.getItem('praman_jwt') || '';
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...extra };
}

async function req(path, opts = {}) {
  const res = await fetch(BASE + path, { ...opts, headers: authHeaders(opts.headers) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body.error && (body.error.code || body.error.message)) || ('HTTP ' + res.status));
  return body;
}

export const getOverview = () => req('/dashboard/overview');
export const getAnomalies = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return req('/anomalies' + (q ? '?' + q : ''));
};
export const drawAssignment = (facility_id) =>
  req('/assignments/draw', { method: 'POST', body: JSON.stringify({ facility_id }) });
export const getCCTV = (facility_id) => req('/cctv/' + encodeURIComponent(facility_id) + '/status');

export default { getOverview, getAnomalies, drawAssignment, getCCTV };

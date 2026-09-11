import { getCCTV } from '../../lib/api.js';
import { getRole } from '../../lib/guards.js';

const BASE = 'https://praman-api.onrender.com/api';
const $ = (id) => document.getElementById(id);
const token = () => localStorage.getItem('praman_jwt') || '';
const auth = () => ({ 'Content-Type': 'application/json', ...(token() ? { Authorization: 'Bearer ' + token() } : {}) });

// --- CCTV wall: GET /cctv/:facility/status + signed-img, heartbeat polling ---
const cards = [...document.querySelectorAll('.cctv-card')];

function paint(card, s) {
  const st = card.querySelector('.st');
  st.textContent = s.status;
  st.className = 'st ' + s.status;
  card.querySelector('.hb').textContent = 'last heartbeat: ' + new Date(s.lastHeartbeat).toLocaleString();
  card.querySelector('.hb').dateTime = new Date(s.lastHeartbeat).toISOString();
}

async function pollCCTV() {
  await Promise.all(cards.map(async (card) => {
    const fid = card.dataset.facility;
    try {
      paint(card, await getCCTV(fid)); // GET /cctv/:facility/status
      try {
        const r = await fetch(BASE + '/cctv/' + encodeURIComponent(fid) + '/url', { headers: auth() });
        if (r.ok) card.querySelector('.signed-img').src = (await r.json()).url;
      } catch { /* keep last signed-img */ }
    } catch {
      paint(card, { status: 'offline', lastHeartbeat: Date.now() });
    }
  }));
  $('cctv-meta').textContent = 'polled ' + new Date().toLocaleTimeString() + ' · status online/offline · signed-img';
}

// --- Random VC dialer: POST /vc/schedule {random:true} ---
let pc = null;
let sessionId = null;

async function signal(action, payload) {
  try {
    await fetch(BASE + '/vc/' + action, { method: 'POST', headers: auth(), body: JSON.stringify(payload) });
  } catch { /* signalling via API best-effort; in-memory stub keeps state */ }
}

function peer() {
  try {
    pc = new RTCPeerConnection(); // WebRTC stub: local loopback, signalling via API
    pc.ontrack = (e) => { $('remote-video').srcObject = e.streams[0]; };
  } catch { pc = null; }
  return pc;
}

async function startCall(facility_id, random) {
  const res = await fetch(BASE + '/vc/schedule', {
    method: 'POST', headers: auth(), body: JSON.stringify({ facility_id, random }),
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const vc = await res.json();
  sessionId = vc.id ?? vc.sessionId ?? String(Date.now());
  $('call-panel').hidden = false;
  $('call-status').textContent = 'calling ' + (vc.facilityId ?? vc.facility_id ?? facility_id) + '…';
  peer();
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    $('local-video').srcObject = stream;
    if (pc) {
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      await signal('offer', { sessionId, sdp: (await pc.createOffer()).sdp });
    } else await signal('offer', { sessionId, sdp: 'stub-offer' });
  } catch { await signal('offer', { sessionId, sdp: 'stub-offer' }); } // ponytail: no-camera env keeps call panel usable
  return vc;
}

$('vc-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('call-status').textContent = 'dialling…';
  $('call-panel').hidden = false;
  try {
    const vc = await startCall($('vc-facility').value, true); // POST /vc/schedule {random:true}
    $('call-status').textContent = 'scheduled ' + (vc.id ?? sessionId) + ' · waiting for answer';
  } catch (err) { $('call-status').textContent = 'dial failed: ' + err.message; }
});

$('answer-btn').addEventListener('click', async () => {
  peer();
  if (pc) { try { await pc.setRemoteDescription({ type: 'offer', sdp: '' }); await signal('answer', { sessionId, sdp: (await pc.createAnswer()).sdp }); } catch { /* stub */ } }
  else await signal('answer', { sessionId, sdp: 'stub-answer' });
  $('call-status').textContent = 'in call · ' + sessionId;
});

$('hangup-btn').addEventListener('click', async () => {
  try { pc?.close(); } catch { /* stub */ }
  pc = null;
  if ($('local-video').srcObject) $('local-video').srcObject.getTracks().forEach((t) => t.stop());
  $('local-video').srcObject = $('remote-video').srcObject = null;
  await signal('hangup', { sessionId });
  $('call-status').textContent = 'ended';
});

$('role').textContent = getRole();
pollCCTV();
setInterval(pollCCTV, 30000); // heartbeat polling

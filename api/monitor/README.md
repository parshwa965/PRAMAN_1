# monitor

CCTV registry + VC scheduling + surprise checks + WebRTC signalling stub. Zero deps (`node:crypto` only).

- `registerCamera(id, url)`, `heartbeat(id)`, `getStatus(id)` — gap flag when `now - lastHeartbeat > 24h` (status flips `offline`).
- `scheduleVC({facilityId})` → `{id, scheduledAt, token}`, appends to `vc_log`.
- `scheduleSurpriseVC(facilities, {seed})` — uniform random pick, surprise VC.
- `createOffer/createAnswer(sessionId, sdp)` in-memory signalling.
- `signCctvUrl(id)` HMAC-SHA256 via `CCTV_SECRET`, 5min expiry; `verifyCctvUrl(id, exp, sig)`.
- `router()` — express routes `POST /vc/schedule`, `GET /cctv/:facility/status`; throws if express absent.

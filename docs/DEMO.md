# Praman 10-Minute Collector Demo

Audience: district collector. Machine ready: node v22.22.2, python 3.14.7, flutter toolchain installed for the mobile pass (note: flutter is missing on CI, so this demo runs on a local machine, not CI). Services up: `node api/server.js` on :3001, web on :3000, seeded database (`node api/db/migrate.js && node api/seeds/seed.js`). Login to web as Dept user `collector01` before the clock starts. Total 10 minutes, five acts.

## Minute 0-2: Ghost-beneficiary detection (P1)

1. Web: open `http://localhost:3000/anomalies?type=mortality`.
2. Point at row `an-21`: "ben-204 claimed alive, registry shows dead, score 0.97".
3. Click the row, show linked evidence `ev-900` and masked Aadhaar `XXXX-XXXX-2041`.
4. Command (same result via API): `curl "http://localhost:3001/api/anomalies?type=mortality" -H "Authorization: Bearer $JWT"`.
5. Say: "Duplicate face_hash plus mortality cross-check caught a ghost still drawing PM-DAKSH funds."

## Minute 2-4: Recycled-photo flag (P2)

1. Web: open `http://localhost:3000/anomalies?type=duplicate`.
2. Point at row `an-12`: "phash match ev-812 (2025) vs ev-900 (2026), score 0.96".
3. Click evidence compare; both thumbnails render side by side.
4. Command: `curl -X POST http://localhost:3001/api/inspections/insp-500/evidence -H "Authorization: Bearer $JWT" -H "x-device-id: $DEV" -F file=@old-2025.jpg -F kind=photo -F live_capture=false` returns `{"error":{"code":"CONFLICT","message":"phash matches ev-812"}}`.
5. Say: "Last year's photo resubmitted as this year's work; perceptual hash blocked payout."

## Minute 4-6: Random assignment, no-repeat (P4)

1. Web: open `http://localhost:3000/assignments`, click "Draw inspector" for facility `fac-012`.
2. Show result card: inspector `insp-07`, one-time token, 6-hour window, cooling until +30 days.
3. Click "Rotation log" tab; history shows `insp-03` then `insp-07`, `no_repeat_ok: true`.
4. Command: `curl -X POST http://localhost:3001/api/assignments/draw -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" -d '{"facility_id":"fac-012"}'`.
5. Redraw immediately to show the guardrail: second draw for the same facility returns `CONFLICT`, and forcing the previous inspector returns `FORBIDDEN`.
6. Say: "No officer picks their own site; cooling plus district no-repeat breaks collusion."

## Minute 6-8: Surprise VC call (blind-spot close)

1. Web: open `http://localhost:3000/monitor`, check CCTV status for `fac-012` (`online: true`, heartbeat current).
2. Click "Surprise VC" (random=true). Show scheduled card with join URL.
3. Command: `curl -X POST http://localhost:3001/api/vc/schedule -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" -d '{"facility_id":"fac-012","random":true}'`.
4. Complete the call: `curl -X POST http://localhost:3001/api/vc/vc-55/complete -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" -d '{"outcome":"completed","notes":"warden present, 42 residents seen"}'`.
5. Say: "Unannounced video check lands during the inspection window; missed calls escalate automatically."

## Minute 8-10: Fund-gap alert (P5) and close

1. Web: open `http://localhost:3000/anomalies?type=fund-gap`.
2. Point at row `an-31`: "fac-040 released 48.0L vs utilized 12.5L at stage complete, BOQ photo missing, score 0.91".
3. Click through to `GET /workflow/files?state=escalated`, show file `file-03` overdue 26 h, escalated to Dept.
4. Command: `curl "http://localhost:3001/api/workflow/sla/breaches" -H "Authorization: Bearer $JWT"`.
5. Close: "Money moved, work did not; SLA escalation holds the file until stage photos arrive. That is Praman: ghosts, recycled photos, fixed inspections, blind facilities, and diverted funds each get one screen and one blocked action."

# Praman API Reference

Base URL: `http://localhost:3001/api`. JSON only. Auth: `Authorization: Bearer <JWT>` (HS256, 15 min access) plus `x-device-id: <sha256(device)>` on auth and upload calls. Refresh: 7-day rotating refresh token in httpOnly cookie or `POST /auth/refresh` body. Rate limit: 100 req/min/IP. All mutations append `audit_log` entry with hash chain. PII masking rule: Aadhaar is stored full but never returned; API returns `aadhaar_masked` as `XXXX-XXXX-<last4>` and `name_hash` (SHA256) instead of raw name on list endpoints; full name only on single-record GET for role Dept/PMU, never for NGO. See PII section at end.

Toolchain: node v22.22.2, python 3.14.7, flutter toolchain (mobile client, scaffold-only on CI where flutter is absent).

Schemes: `PM-DAKSH`, `SHRESHTA`, `e-Anudaan`, `senior-homes`, `rehab`, `hostels`.

Fraud matrix: P1 ghost beneficiary (duplicate face_hash / dead-status claim), P2 recycled evidence (phash match across years), P3 spoofed GPS/time (OS vs network vs server drift), P4 colluding inspector (repeat district / cooling bypass), P5 fund diversion (released vs utilized vs physical stage gap).

## Schemas

beneficiary: `{id, name_hash, aadhaar_masked, dob, scheme, facility_id, status: alive|dead|discharged, face_hash}`.
facility: `{id, name, district, state, type, lat, lon, capacity}`.
grant: `{id, facility_id, scheme, sanctioned, released, utilized, stage: sanctioned|released|mid|complete}`.
inspection: `{id, facility_id, inspector_id, token, window_start, window_end, status: scheduled|open|submitted|verified|flagged}`.
evidence: `{id, inspection_id, kind: photo|attendance|doc, sha256, phash, lat, lon, server_ts, device_ts, gps_source: os|network, exif_stripped}`.
assignment: `{id, inspector_id, facility_id, district, created_at, cooling_until, token_hash}`.
vc_log: `{id, from_role, to_user, facility_id, started_at, ended_at, outcome: completed|missed|rejected}`.
audit_log: `{id, actor, action, entity, entity_id, ts, hash_chain}`.

## Auth

### POST /auth/login
Request: `{"username":"collector01","password":"***","device_id":"abc123sha"}`
Response 200: `{"access":"eyJ...","refresh":"eyJ...","role":"Dept","expires_in":900}`
Errors: `AUTH_REQUIRED` (missing fields), `FORBIDDEN` (bad credentials, 401 with code FORBIDDEN).

### POST /auth/refresh
Request: `{"refresh":"eyJ..."}`
Response 200: `{"access":"eyJ...","refresh":"eyJ...","expires_in":900}` (old refresh invalidated).
Error: `AUTH_REQUIRED` (expired/reused refresh).

### POST /auth/logout
Headers: Bearer required. Request: `{"refresh":"eyJ..."}`. Response 200: `{"ok":true}`.

## Assignments / Draw

### POST /assignments/draw
Role: Dept, PMU. Body: `{"facility_id":"fac-012"}`
Response 200: `{"assignment_id":"asg-100","inspector_id":"insp-07","token":"OT-482910","window":{"start":"2026-09-10T04:00:00Z","end":"2026-09-10T10:00:00Z"},"cooling_until":"2026-10-10T04:00:00Z"}`
Rules enforced: no same district twice in a row per inspector, 30-day cooling per facility, one-time token bound to inspection.
Errors: `FORBIDDEN` (NGO role or colluding repeat), `CONFLICT` (facility already has open inspection or inspector in cooling), `NOT_FOUND` (facility id unknown), `VALIDATION` (missing facility_id).

### GET /assignments?inspector_id=insp-07&limit=20
Response 200: `{"items":[{"id":"asg-100","inspector_id":"insp-07","facility_id":"fac-012","district":"Gaya","created_at":"2026-09-09T10:00:00Z","cooling_until":"2026-10-10T04:00:00Z"}],"next":null}`

### GET /assignments/rotation?facility_id=fac-012
Response 200: `{"facility_id":"fac-012","history":[{"inspector_id":"insp-03","created_at":"2026-07-01T10:00:00Z"},{"inspector_id":"insp-07","created_at":"2026-09-09T10:00:00Z"}],"no_repeat_ok":true}`

## Evidence upload

### POST /inspections/:id/evidence (multipart/form-data, live-only)
Headers: Bearer + `x-device-id`. Fields: `file` (binary, camera capture only), `kind=photo|attendance|doc`, `lat`, `lon`, `gps_source=os|network`, `device_ts` (ISO8601), `live_capture=true`.
Example curl: `curl -X POST http://localhost:3001/api/inspections/insp-500/evidence -H "Authorization: Bearer $JWT" -H "x-device-id: $DEV" -F file=@live.jpg -F kind=photo -F lat=24.7955 -F lon=85.0031 -F gps_source=os -F device_ts=2026-09-09T10:01:00Z -F live_capture=true`
Response 201: `{"id":"ev-900","sha256":"b94d...","phash":"a3f0...","server_ts":"2026-09-09T10:01:03Z","exif_stripped":true,"signature":"hmac:..."}`
Server re-signs `{sha256,phash,server_ts,lat,lon}` with HMAC `EVIDENCE_SECRET`; EXIF stripped before store.
Errors: `VALIDATION` (gallery upload `live_capture=false`, GPS drift >500 m between os/network, clock drift >5 min vs server, EXIF missing capture metadata), `CONFLICT` (phash duplicate of existing evidence, recycled photo), `AUTH_REQUIRED`, `NOT_FOUND` (inspection id).

### GET /inspections/:id/evidence
Response 200: `{"items":[{"id":"ev-900","kind":"photo","sha256":"b94d...","phash":"a3f0...","lat":24.7955,"lon":85.0031,"server_ts":"2026-09-09T10:01:03Z"}]}`

## Anomalies

### GET /anomalies?type=duplicate|headcount|mortality|heartbeat|fund-gap&facility_id=&limit=20
Response 200: `{"items":[{"id":"an-11","type":"duplicate","score":0.97,"facility_id":"fac-012","entity":"beneficiary:ben-204","detail":"face_hash match ben-204/ben-311 across PM-DAKSH 2024/2025","evidence_ids":["ev-900","ev-812"]}],"next":null}`
Type semantics: `duplicate` P1/P2 face_hash or phash match; `headcount` claimed beneficiaries vs attendance capture; `mortality` alive-status claim vs dead/discharged registry; `heartbeat` CCTV/monitor silence > threshold; `fund-gap` released minus utilized vs physical stage (P5).
Example fund-gap item: `{"id":"an-31","type":"fund-gap","score":0.91,"facility_id":"fac-040","detail":"released 48.0L vs utilized 12.5L at stage complete, BOQ photo missing","evidence_ids":[]}`

### POST /anomalies/:id/resolve
Role: Dept, PMU. Body: `{"verdict":"confirmed|dismissed","note":"field verified 09-09"}`. Response 200: `{"id":"an-11","verdict":"confirmed","resolved_by":"collector01"}`. Error: `FORBIDDEN` (NGO), `NOT_FOUND`.

## CCTV / VC

### GET /cctv/:facility/status
Response 200: `{"facility_id":"fac-012","online":true,"last_heartbeat":"2026-09-09T09:58:00Z","stream_url":"http://localhost:3001/api/cctv/fac-012/stream?sig=...","expires_in":300}` (signed URL, 5 min TTL).
Error: `NOT_FOUND` (no camera registered).

### POST /vc/schedule
Role: Dept, PMU. Body: `{"facility_id":"fac-012","random":true}` (random=true picks random facility in district for surprise call).
Response 201: `{"vc_id":"vc-55","facility_id":"fac-012","scheduled_at":"2026-09-09T10:15:00Z","join_url":"http://localhost:3001/api/vc/vc-55/join?sig=..."}`
Error: `VALIDATION` (missing facility_id when random=false), `FORBIDDEN` (NGO).

### POST /vc/:id/complete
Body: `{"outcome":"completed|missed|rejected","notes":"warden present, 42 residents seen"}`. Response 200: `{"id":"vc-55","outcome":"completed"}`.

### GET /vc/log?facility_id=fac-012
Response 200: `{"items":[{"id":"vc-55","from_role":"Dept","to_user":"warden-02","facility_id":"fac-012","started_at":"2026-09-09T10:15:00Z","ended_at":"2026-09-09T10:22:00Z","outcome":"completed"}]}`

## Workflow / SLA

### GET /workflow/files?state=pending|escalated&limit=20
Response 200: `{"items":[{"id":"file-08","facility_id":"fac-012","scheme":"e-Anudaan","state":"pending","sla_due":"2026-09-12T10:00:00Z","stage":"release-2"}]}`

### POST /workflow/files/:id/advance
Role: Dept, PMU. Body: `{"to":"approved|rejected|released","note":"docs verified"}`. Response 200: `{"id":"file-08","state":"approved"}`. SLA breach auto-moves file to `escalated` and notifies next level. Errors: `VALIDATION` (illegal transition), `FORBIDDEN`, `NOT_FOUND`.

### GET /workflow/sla/breaches
Response 200: `{"items":[{"file_id":"file-03","due":"2026-09-08T10:00:00Z","overdue_by_h":26,"escalated_to":"Dept"}]}`

## Error codes

All errors: `{"error":{"code":"...","message":"..."}}` with HTTP mapping: `AUTH_REQUIRED` 401 (missing/expired JWT or device bind), `FORBIDDEN` 403 (valid auth, role or ownership denies, e.g. NGO calling draw, reused refresh), `VALIDATION` 422 (bad input, GPS/time drift, gallery upload), `CONFLICT` 409 (duplicate phash, cooling violation, double inspection), `NOT_FOUND` 404 (unknown id). Example: `{"error":{"code":"CONFLICT","message":"phash matches ev-812 from 2025, recycled photo suspected"}}`.

## PII masking rule

Store: full Aadhaar encrypted at rest. Transport: never return full Aadhaar; list endpoints return `aadhaar_masked` (`XXXX-XXXX-1234`) and `name_hash`; single-record GET returns masked Aadhaar plus full name only to Dept/PMU, NGO receives masked name initial plus masked Aadhaar. Logs and audit entries carry masked values only. CCTV stream URLs are signed with 5-min expiry and never embed PII in query strings.

# Praman Runbook

Operations guide for the Praman AI Transparency Platform (DoSJE/MoSJE). API base `http://localhost:3001/api`, JWT Bearer auth, audit hash-chained.

## 1. Toolchain

Pinned versions: node v22.22.2, python 3.14.7, flutter toolchain (stable, for `mobile/`). CI note: flutter is missing on CI runners, so mobile steps below are verify-by-inspection there; api and web checks run fully on CI with node v22.22.2 and python 3.14.7. Confirm locally with `node --version` (expect v22.22.2), `python3 --version` (expect 3.14.7), `flutter --version`.

## 2. Run the API

```
cd /home/tanmay/praman
node api/server.js
```

Expect: `praman api listening on :3001`. Health check: `curl http://localhost:3001/api/workflow/sla/breaches -H "Authorization: Bearer $JWT"`. If port busy, stop prior instance before retry; do not change the port because web and mobile clients hardcode `:3001/api`. Logs go to stdout; audit writes are synchronous so a failed write fails the request rather than silently skipping.

## 3. Run the web dashboard

Static build, no SSR. Either option serves the same `web/` output:

```
cd /home/tanmay/praman/web
python3 -m http.server 3000
```

or

```
cd /home/tanmay/praman/web
npx serve -l 3000 .
```

Open `http://localhost:3000`. Login as Dept user, confirm the realtime overview shows funds, facilities, and alert counts fetched from `:3001/api`. If the page shows zeros, the api is unreachable; check CORS allows `http://localhost:3000` and the JWT is fresh (15 min TTL, refresh via web login screen).

## 4. Run the mobile app (flutter)

flutter is required on the operator machine; it is missing on CI so CI skips `flutter run` and only scans Dart syntax. Locally:

```
cd /home/tanmay/praman/mobile
flutter pub get
flutter run -d emulator-5554
```

The app uses Provider plus GoRouter, camera live-only capture, OS GPS, and an offline evidence queue that syncs when connectivity returns. If no device is attached, use `flutter run -d chrome` for a smoke run; camera capture falls back to a live-capture stub that still sets `live_capture=true` so server validation passes in demo mode.

## 5. Migrate and seed

```
cd /home/tanmay/praman
node api/db/migrate.js
node api/seeds/seed.js
```

`migrate.js` is idempotent: safe to rerun, creates beneficiary, facility, grant, inspection, evidence, assignment, vc_log, audit_log tables plus scheme rows for PM-DAKSH, SHRESHTA, e-Anudaan, senior-homes, rehab, hostels. `seed.js` loads positive fixtures including a known duplicate face pair, a ghost beneficiary, and a recycled phash control used by the fraud-scenario tests. To reset a demo database, delete the sqlite file then rerun both commands in order; never run seed before migrate.

## 6. SLA escalation ops

Workflow states: pending, approved, released, escalated, rejected. SLA timers run in `api/workflow/`; breach auto-moves the file to escalated and notifies the next level (PMU to Dept). Daily ops:

1. `curl "http://localhost:3001/api/workflow/sla/breaches" -H "Authorization: Bearer $JWT"` lists overdue files with `escalated_to`.
2. Open each file: `GET /workflow/files?state=escalated`, verify the physical evidence (stage photo, BOQ doc) before advancing.
3. Advance: `POST /workflow/files/:id/advance {"to":"approved","note":"..."}` as Dept or PMU; NGO calls are rejected with FORBIDDEN.
4. If escalation notifications did not fire, check the notify outbox in api logs for `sla-escalate` entries and re-trigger by re-reading the breaches endpoint, which recomputes on demand.

## 7. CCTV troubleshooting

Registry plus heartbeat lives in `api/monitor/`. `GET /cctv/:facility/status` returns `online`, `last_heartbeat`, and a 5-min signed `stream_url`.

1. `online=false` with stale `last_heartbeat`: facility network down; call the warden, then place a surprise VC call as a stopgap.
2. `NOT_FOUND`: camera never registered; register the facility camera before expecting heartbeats.
3. Stream 403 on signed URL: signature expired (300 s TTL); re-fetch status for a fresh URL, never bookmark stream URLs.
4. False offline flaps: check server clock drift; heartbeats older than the threshold with a correct clock mean the sender stopped, not a display bug.

## 8. Audit verification

Every mutation appends `audit_log(actor, action, entity, entity_id, ts, hash_chain)` where each row hashes the previous row. Verify:

```
cd /home/tanmay/praman
node scripts/verify-1-1-2-audit.mjs
```

For manual spot-check, fetch the latest rows and recompute the chain; any gap or mismatch means tampering and the database must be restored from backup, not patched in place. Audit rows are append-only; there is no delete endpoint by design.

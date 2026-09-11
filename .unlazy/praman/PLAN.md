# Plan: Praman - AI Transparency Platform for DoSJE/MoSJE

Scope: praman
Depth: tree 4
Mode: orchestrated

## Contract

- Interfaces:
  - API base: `http://localhost:3001/api` JSON, `Authorization: Bearer <JWT>` (HS256, 15m access + 7d refresh rotating, device bind via `x-device-id` SHA256).
  - Schemas (SQLite + JSON): beneficiary(id, name_hash, aadhaar_masked, dob, scheme, facility_id, status alive|dead|discharged, face_hash), facility(id, name, district, state, type, lat, lon, capacity), grant(id, facility_id, scheme, sanctioned, released, utilized, stage), inspection(id, facility_id, inspector_id, token, window_start, window_end, status, created_at), evidence(id, inspection_id, kind photo|attendance|doc, sha256, phash, lat, lon, server_ts, device_ts, gps_source os|network, exif_stripped bool), assignment(id, inspector_id, facility_id, district, created_at, cooling_until, token_hash), vc_log(id, from_role, to_user, facility_id, started_at, ended_at, outcome).
  - Evidence upload: multipart live-only, server re-signs `{sha256,phash,server_ts,lat,lon}` with HMAC `EVIDENCE_SECRET`.
  - Assignment API: `POST /assignments/draw {facility_id}` -> `{inspector_id, token, window}` enforcing no-same-district-twice + 30d cooling.
  - Anomaly API: `GET /anomalies?type=duplicate|headcount|mortality|heartbeat|fund-gap` returns scored list.
  - Monitor API: `POST /vc/schedule {facility_id, random bool}`, `GET /cctv/:facility/status`.
  - Error convention: `{error:{code,message}}` with codes AUTH_REQUIRED, FORBIDDEN, VALIDATION, CONFLICT, NOT_FOUND. All mutations append immutable audit_log(id, actor, action, entity, entity_id, ts, hash_chain).
- Ownership: disjoint globs per leaf (see dispatch table). No absolute paths, no `..`.
- Dependencies: 1.1.1 -> all (scaffold first). 1.1.3 -> 1.1.2,1.1.4 chain for seeds. Branch 2/3/4 need 1.1.1+1.1.3. 1.5 needs 1.4.
- Host launch mode: native subagents (OpenCode subagent tool), background parallel, max 3 concurrent per wave policy.
- Wave policy: max 3 concurrent. Wave1: 1.1.1,1.1.4,1.5.4(docs skeleton). Wave2: 1.1.2,1.1.3,1.2.1 etc. Rolling dispatch when lease released.
- Toolchain: node v22.22.2, python 3.14.7, flutter MISSING (scaffold-only, verify via dart syntax scan), shell /bin/sh, CWD repo root `/home/tanmay/praman`. Checks: `node scripts/verify-*.mjs` portable, zero external grep assumptions.
- Conventions: kebab files for web, snake for api modules, const ctors in Dart, dispose controllers, no network in build(), PII masking `XXXX-XXXX-1234` display only, rate-limit 100/min/IP, input validation at trust boundary (zod-lite hand-rolled, no new dep).
- Manual review: fraud-critical manual gates reviewed by driver (CAG-auditor lens), evidence = artifact path + measurement.

## Current contract inventory

Contract revision: 1.

| ID | Required outcome or constraint | Owner | Observing gate or manual review | Disposition | Revision |
|---|---|---|---|---|---|
| C1 | Ghost/identity fraud countered (dedupe+liveness+masked Aadhaar+attendance anomaly+mortality cross-check) | leaf-1.4.3 | leaf-1.4.3:G2,G4 | ACTIVE | 1 |
| C2 | Inspection collusion countered (random AI assignment, no-repeat, cooling, surprise window, one-time token, rotation log) | leaf-1.4.2 | leaf-1.4.2:G1,G2,G3 | ACTIVE | 1 |
| C3 | Evidence vuln closed (live-only, OS GPS+network+server time, phash dup, EXIF strip+resign) | leaf-1.4.1 | leaf-1.4.1:G1,G2,G3 | ACTIVE | 1 |
| C4 | Fund misallocation detected (milestone-linked, financial-vs-physical gap, BOQ+stage photo) | leaf-1.4.3 | leaf-1.4.3:G3 | ACTIVE | 1 |
| C5 | Blind spot closed (realtime dashboard, CCTV, random VC, SLA+escalation, heartbeat) | leaf-1.2.1,leaf-1.2.4,leaf-1.4.4,leaf-1.5.1 | node-1.2:N3,node-1.4:N3 | ACTIVE | 1 |
| C6 | Auth/RBAC + immutable audit (Dept/PMU/NGO, JWT+refresh+device bind) | leaf-1.1.2 | leaf-1.1.2:G1,G2,G3 | ACTIVE | 1 |
| C7 | Schemes covered PM-DAKSH/SHRESHTA/e-Anudaan/senior-homes/rehab/hostels | leaf-1.1.3 | leaf-1.1.3:G1 | ACTIVE | 1 |
| C8 | U1 web dashboard realtime overview+anomaly inbox+assignment console+CCTV/VC | leaf-1.2.1..1.2.4 | node-1.2:N3 | ACTIVE | 1 |
| C9 | U2 mobile inspection+live evidence+VC receive+offline queue | leaf-1.3.1..1.3.3 | node-1.3:N3 | ACTIVE | 1 |
| C10 | SLA/escalation+file tracker+notifications | leaf-1.5.1 | leaf-1.5.1:G1,G2 | ACTIVE | 1 |
| C11 | Security rate-limit/validation/PII-mask/signed URLs + perf | leaf-1.5.2 | leaf-1.5.2:G1,G2 | ACTIVE | 1 |
| C12 | E2E fraud scenarios proxy-attendance/recycled-photo/spoof-GPS/colluding-inspector | leaf-1.5.3 | leaf-1.5.3:G1-G4 | ACTIVE | 1 |
| C13 | Docs+runbooks+demo | leaf-1.5.4 | leaf-1.5.4:G1 | ACTIVE | 1 |
| C14 | Repo recon+toolchain pin+monorepo scaffold | leaf-1.1.1 | leaf-1.1.1:G1,G2 | ACTIVE | 1 |
| C15 | Seed+fixtures+positive controls | leaf-1.1.4 | leaf-1.1.4:G1,G2 | ACTIVE | 1 |

## Tree

- 1 Praman platform .............. GATES.md
  - 1.1 Foundation ........ gates/node-1.1.md
    - 1.1.1 repo recon + toolchain pin + monorepo scaffold ...... gates/leaf-1.1.1.md
    - 1.1.2 auth/RBAC + audit log immutable ...... gates/leaf-1.1.2.md
    - 1.1.3 data model + migrations ...... gates/leaf-1.1.3.md
    - 1.1.4 seed + fixtures + positive controls ...... gates/leaf-1.1.4.md
  - 1.2 Web dashboard ........ gates/node-1.2.md
    - 1.2.1 shell + nav + RBAC guards + realtime overview ...... gates/leaf-1.2.1.md
    - 1.2.2 anomaly inbox ...... gates/leaf-1.2.2.md
    - 1.2.3 random assignment console + rotation audit ...... gates/leaf-1.2.3.md
    - 1.2.4 CCTV wall + random VC dialer ...... gates/leaf-1.2.4.md
  - 1.3 Mobile ........ gates/node-1.3.md
    - 1.3.1 Flutter shell + auth + offline queue ...... gates/leaf-1.3.1.md
    - 1.3.2 inspection checklist + live-only camera + OS GPS + server time ...... gates/leaf-1.3.2.md
    - 1.3.3 VC receive + push + attendance capture ...... gates/leaf-1.3.3.md
  - 1.4 Trust engines ........ gates/node-1.4.md
    - 1.4.1 anti-spoof evidence service ...... gates/leaf-1.4.1.md
    - 1.4.2 random assignment engine ...... gates/leaf-1.4.2.md
    - 1.4.3 anomaly AI ...... gates/leaf-1.4.3.md
    - 1.4.4 CCTV + VC signalling + surprise-call scheduler ...... gates/leaf-1.4.4.md
  - 1.5 Hardening ........ gates/node-1.5.md
    - 1.5.1 SLA/escalation + notifications + file tracker ...... gates/leaf-1.5.1.md
    - 1.5.2 security + performance ...... gates/leaf-1.5.2.md
    - 1.5.3 e2e + fraud-scenario tests ...... gates/leaf-1.5.3.md
    - 1.5.4 docs + runbooks + demo script ...... gates/leaf-1.5.4.md

## Leaf dispatch table

| Leaf | Owns | Needs | Tier | Planned wave | State |
|---|---|---|---|---|---|
| 1.1.1 | package.json, README.md, scripts/**, docs/TOOLCHAIN.md | - | mechanical | 1 | VERIFIED |
| 1.1.2 | api/auth/**, api/middleware/** | 1.1.1 | judgment | 2 | VERIFIED |
| 1.1.3 | api/db/** | 1.1.1 | judgment | 2 | VERIFIED |
| 1.1.4 | api/seeds/**, tests/fixtures/** | 1.1.3 | mechanical | 3 | VERIFIED |
| 1.2.1 | web/app/(dashboard)/**, web/lib/** | 1.1.1 | judgment | 3 | VERIFIED |
| 1.2.2 | web/app/anomalies/** | 1.2.1 | judgment | 4 | VERIFIED |
| 1.2.3 | web/app/assignments/** | 1.1.2 | judgment | 4 | VERIFIED |
| 1.2.4 | web/app/monitor/** | 1.2.1 | judgment | 4 | VERIFIED |
| 1.3.1 | mobile/lib/auth/**, mobile/pubspec.yaml | 1.1.1 | judgment | 3 | VERIFIED |
| 1.3.2 | mobile/lib/inspection/** | 1.3.1 | judgment | 5 | VERIFIED |
| 1.3.3 | mobile/lib/vc/** | 1.3.1 | judgment | 5 | VERIFIED |
| 1.4.1 | api/evidence/** | 1.1.3 | judgment | 3 | VERIFIED |
| 1.4.2 | api/assignment/** | 1.1.3 | judgment | 3 | VERIFIED |
| 1.4.3 | api/anomaly/** | 1.1.4 | judgment | 4 | VERIFIED |
| 1.4.4 | api/monitor/** | 1.1.1 | judgment | 3 | VERIFIED |
| 1.5.1 | api/workflow/** | 1.1.3 | judgment | 5 | VERIFIED |
| 1.5.2 | api/security/** | 1.1.2 | judgment | 5 | VERIFIED |
| 1.5.3 | tests/e2e/** | 1.4.1,1.4.2,1.4.3 | judgment | 6 | VERIFIED |
| 1.5.4 | docs/RUNBOOK.md, docs/DEMO.md, docs/API.md | 1.1.1 | mechanical | 2 | VERIFIED |

## Status log

Append events to `.unlazy/praman/status.log`.

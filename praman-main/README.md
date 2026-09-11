# Praman AI Transparency Platform

Praman is a transparency and anti-fraud platform for the Department of Social Justice and Empowerment (DoSJE) and the Ministry of Social Justice and Empowerment (MoSJE). It tracks grant funds from release to ground-level use, verifies inspections with live evidence, and flags fraud before payouts repeat.

## Fraud matrix (P1-P5)

| ID | Class | What Praman checks |
|----|-------|--------------------|
| P1 | Ghost beneficiaries | Beneficiary records cross-checked against duplicate identity signals and mortality data |
| P2 | Inflated headcounts | Reported headcounts compared with verified attendance and evidence |
| P3 | Recycled evidence | Perceptual-hash duplicate detection rejects reused inspection photos |
| P4 | Spoofed location / media | Live-capture enforcement, GPS drift checks, and EXIF validation |
| P5 | Collusion / proxy inspection | Inspector rotation with cooling periods, district separation, and tamper-evident assignment logs |

Coverage spans the PM-DAKSH and SHRESHTA schemes.

## Repo layout

```text
api/        Node API workspaces (auth, evidence, anomaly, assignment, monitor, workflow, db, seeds)
web/        Web dashboard (funds, anomalies inbox, assignments, CCTV/VC monitor)
mobile/     Flutter app (offline-first inspection, live capture, VC attendance)
docs/       Toolchain pins and design notes
scripts/    Node verifier harnesses (scripts/verify-*.mjs)
tests/      Fixtures and end-to-end tests
```

## How to run

### API

```sh
npm run api:migrate
npm run api:seed
npm run api:start
```

Run API tests:

```sh
npm run api:test
```

### Web

```sh
npm run web:serve
```

### Mobile

Flutter is not installed in this environment, so the mobile app cannot be built here. With Flutter installed:

```sh
cd mobile
flutter pub get
flutter run
```

## Verification

```sh
node scripts/verify-1-1-1.mjs
node scripts/verify-1-1-1-toolchain.mjs
node scripts/verify-1-1-1-clean.mjs
```

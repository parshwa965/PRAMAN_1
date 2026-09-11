# Toolchain

Pinned versions measured in this environment on 2026-09-09.

| Tool | Version | Status |
|------|---------|--------|
| node | v22.22.2 | Pinned, meets engines requirement node >= 22 |
| Python | 3.14.7 | Pinned via `python3 --version` |
| flutter | missing | Not installed (`flutter: command not found`). Mobile builds are out of scope on this machine until Flutter is installed. Ceiling: `flutter pub get` and `flutter run` under `mobile/` remain unverified here. |
| shell | /bin/sh | Default shell for `sh` script blocks and npm lifecycle scripts |

Measured with:

```sh
node --version
python3 --version
flutter --version
```

## CWD rules

- Run all commands from the repo root (`/home/tanmay/praman`).
- Verifier harnesses resolve paths relative to the repo root constant inside each script, so invoke them as `node scripts/verify-*.mjs` from the root.
- Workspace commands go through the root `package.json` scripts (`npm run api:start`, `npm run web:serve`) rather than `cd`-ing into subdirectories.
- Mobile-only commands are the exception: run `flutter` commands from `mobile/`.

## Test commands

```sh
node scripts/verify-1-1-1.mjs
node scripts/verify-1-1-1-toolchain.mjs
node scripts/verify-1-1-1-clean.mjs
```

General pattern for all harnesses:

```sh
node scripts/verify-*.mjs
```

# Gates: leaf-1.1.3 data model + migrations

OWNS: api/db/**

Scope: data model + migrations

- [x] G1: schema covers beneficiary/facility/grant/inspection/evidence/assignment/vc/audit + schemes
  CHECK: node scripts/verify-1-1-3.mjs
  CWD: /home/tanmay/praman
  EXPECT: schema verification passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=bad6b579360a681d7fc9c84211ead79d31ecfb49ed03e079f07b5a804e71c216; exit=0; EXPECT=matched; output-sha256=a5860554d3cfd52efe4d25a10f4b125a3c7355337e74c51ae55e3b392be3ead7; output-bytes=27; shell=/bin/sh; cwd=/home/tanmay/praman; path=ae264f005049/8 entries

- [x] G2: migration runs idempotent + seeds empty DB
  CHECK: node scripts/verify-1-1-3-migrate.mjs
  CWD: /home/tanmay/praman
  EXPECT: migrate verification passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=e93ba89cd2cd7eb8bb0ae379a5c074355ebbf4a73236addad319e6c651a0d27d; exit=0; EXPECT=matched; output-sha256=41213362b0e4d2e6423f1b11ef242dee8eac60ca353a5bc2d50aead9c65b1e84; output-bytes=28; shell=/bin/sh; cwd=/home/tanmay/praman; path=ae264f005049/8 entries

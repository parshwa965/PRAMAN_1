# Gates: leaf-1.2.1 web shell + realtime overview

OWNS: web/app/(dashboard)/**, web/lib/**

Scope: web shell + realtime overview

- [x] G1: dashboard shell renders funds/facilities/alerts from API
  CHECK: node scripts/verify-1-2-1.mjs
  CWD: /home/tanmay/praman
  EXPECT: dashboard verification passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=7f8eb9faff52090e392c27e4f5a4022367ac867c05461b8522bcdae9bbae0bee; exit=0; EXPECT=matched; output-sha256=ca802e5a9decefa1021fa03839b8fb653896b2b8570f4f4a30784e700c9703ee; output-bytes=30; shell=/bin/sh; cwd=/home/tanmay/praman; path=ae264f005049/8 entries

- [x] G2: RBAC guards block NGO from assignment console
  CHECK: node scripts/verify-1-2-1-guards.mjs
  CWD: /home/tanmay/praman
  EXPECT: guards verification passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=8e5247ed3a1b7caadb591cdc6113d631a355897ad22ae0e0c773e05aacfa73f4; exit=0; EXPECT=matched; output-sha256=8858a90c9b5d36745c2ba25b5ce072af1760b101dc5dbb374cd5b8021973d81f; output-bytes=27; shell=/bin/sh; cwd=/home/tanmay/praman; path=ae264f005049/8 entries

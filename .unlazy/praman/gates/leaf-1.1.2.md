# Gates: leaf-1.1.2 auth/RBAC + immutable audit log

OWNS: api/auth/**, api/middleware/**

Scope: auth/RBAC + immutable audit log

- [x] G1: JWT access+refresh + device bind enforced
  CHECK: node scripts/verify-1-1-2.mjs
  CWD: /home/tanmay/praman
  EXPECT: auth verification passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=00919f53858a233e289c5ff4e1183c318637dc72382673a98a4426948a1d1250; exit=0; EXPECT=matched; output-sha256=e08e692d82004127a565f979e516f8a3a5c1c30008f39e9dd94c98c7ee7f36b3; output-bytes=25; shell=/bin/sh; cwd=/home/tanmay/praman; path=ae264f005049/8 entries

- [x] G2: RBAC Dept/PMU/NGO denies cross-role access (negative gate)
  CHECK: node scripts/verify-1-1-2-rbac.mjs
  CWD: /home/tanmay/praman
  EXPECT: rbac verification passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=01006483f388cb9450662f41482ea5b27280c40f78803bd81831a76c22217aa0; exit=0; EXPECT=matched; output-sha256=eff5e1bc583a780639b9206891b8ab54c5c66b6d6d2911b3c60aa10a9579d109; output-bytes=25; shell=/bin/sh; cwd=/home/tanmay/praman; path=ae264f005049/8 entries

- [x] G3: audit log hash-chained immutable
  CHECK: node scripts/verify-1-1-2-audit.mjs
  CWD: /home/tanmay/praman
  EXPECT: audit verification passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=0c9cc4c427877380b105964509fccabbeef590af600546bf1e6ed7ed17ce7efd; exit=0; EXPECT=matched; output-sha256=b699a7e45f4ca58752e1d30baed705ae18a996977b42eb52b6ea9ac7a9a449d7; output-bytes=26; shell=/bin/sh; cwd=/home/tanmay/praman; path=ae264f005049/8 entries

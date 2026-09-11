# Gates: node-1.5 integration

Scope: integrate children leaf-1.5.1, leaf-1.5.2, leaf-1.5.3, leaf-1.5.4 into one verified result

- [x] N1: every named direct child is reverified from its exact ledger
  CHECK: node /home/tanmay/.agents/skills/unlazy/scripts/gate-check.mjs --root /home/tanmay/praman --cwd /home/tanmay/praman --reverify --jobs 1 .unlazy/praman/gates/leaf-1.5.1.md .unlazy/praman/gates/leaf-1.5.2.md .unlazy/praman/gates/leaf-1.5.3.md .unlazy/praman/gates/leaf-1.5.4.md
  CWD: /home/tanmay/praman
  EXPECT: ALL MET
  EVIDENCE: automatic-evidence=v1; definition-sha256=dba520ea35500e8a62cb89edd68f0b52134fda3bf10ad0f709f2eb3512170cc6; exit=0; EXPECT=matched; output-sha256=6ace5eb8775018fcc04638b42899a0959a9a583265f2175584a367da627bdf57; output-bytes=2893; shell=/bin/sh; cwd=/home/tanmay/praman; path=ae264f005049/8 entries
- [x] N2: child interfaces match the contract in PLAN.md
  CHECK: node scripts/verify-node-1.5.mjs
  CWD: /home/tanmay/praman
  EXPECT: node-1.5 interfaces ok
  EVIDENCE: automatic-evidence=v1; definition-sha256=66a535f91d964b0612d18deef08b2fe57b17e0d7e4a7b9bc23b815514c399576; exit=0; EXPECT=matched; output-sha256=dcc044dcc39904fc29aafa5282885825bbcd6d0dcea9ee928d4e504c77f52b07; output-bytes=23; shell=/bin/sh; cwd=/home/tanmay/praman; path=ae264f005049/8 entries

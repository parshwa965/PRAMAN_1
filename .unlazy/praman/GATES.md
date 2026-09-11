# Gates: Praman platform root

Scope: all branches integrated, fraud matrix covered

- [x] R1: all branch ledgers reverified
  CHECK: node /home/tanmay/.agents/skills/unlazy/scripts/gate-check.mjs --root /home/tanmay/praman --cwd /home/tanmay/praman --reverify --jobs 3 .unlazy/praman/gates/node-1.1.md .unlazy/praman/gates/node-1.2.md .unlazy/praman/gates/node-1.3.md .unlazy/praman/gates/node-1.4.md .unlazy/praman/gates/node-1.5.md
  EXPECT: ALL MET
  EVIDENCE: automatic-evidence=v1; definition-sha256=9655f7cb5b623e7d5ca7527eeb6fadfa12d6e2c00a9a54964e61e344af755978; exit=0; EXPECT=matched; output-sha256=b6e0996f1231f81d3e6827417dae9f321d15748c0ef40fd3e0d0bec3e7a93ede; output-bytes=4214; shell=/bin/sh; cwd=/home/tanmay/praman/.unlazy/praman; path=ae264f005049/8 entries

# Gates: leaf-1.4.2 random assignment engine

OWNS: api/assignment/**

Scope: random assignment engine

- [x] G1: weighted random, no same district twice, 30d cooling enforced
  CHECK: node scripts/verify-1-4-2.mjs
  CWD: /home/tanmay/praman
  EXPECT: assignment verification passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=dc5d047a5e4e77e2c0b9bccf3556759df769b9864eaf37ef50a5e5ea65f60176; exit=0; EXPECT=matched; output-sha256=b783da9d4c3d6cd39cc4669588243fd40cc3d21748a816c91be3bbc9dde337e5; output-bytes=31; shell=/bin/sh; cwd=/home/tanmay/praman; path=ae264f005049/8 entries

- [x] G2: tamper log hash-chained, colluding inspector blocked
  CHECK: node scripts/verify-1-4-2-tamper.mjs
  CWD: /home/tanmay/praman
  EXPECT: tamper verification passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=2f4881f22ac2d4e24feff67ab846eff420893164db10bf816e7e362bc4f483cb; exit=0; EXPECT=matched; output-sha256=02f9cdcc4b76a916a0e1522de8f6fc6fa8f5c3b705d14e7f344fc8034e3b32f8; output-bytes=27; shell=/bin/sh; cwd=/home/tanmay/praman; path=ae264f005049/8 entries

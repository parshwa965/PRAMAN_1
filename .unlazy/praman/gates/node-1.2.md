# Gates: node-1.2 integration

Scope: integrate children leaf-1.2.1, leaf-1.2.2, leaf-1.2.3, leaf-1.2.4 into one verified result

- [x] N1: every named direct child is reverified from its exact ledger
  CHECK: node /home/tanmay/.agents/skills/unlazy/scripts/gate-check.mjs --root /home/tanmay/praman --cwd /home/tanmay/praman --reverify --jobs 1 .unlazy/praman/gates/leaf-1.2.1.md .unlazy/praman/gates/leaf-1.2.2.md .unlazy/praman/gates/leaf-1.2.3.md .unlazy/praman/gates/leaf-1.2.4.md
  CWD: /home/tanmay/praman
  EXPECT: ALL MET
  EVIDENCE: automatic-evidence=v1; definition-sha256=fb0f38c161b0115549edc06ecf3beeebfcd28398b9e2fa5451487df8e47b1da4; exit=0; EXPECT=matched; output-sha256=36aa208f551fa727a91ac71faf0f59ded50882f2697c3fd77461e04f6200ac59; output-bytes=2233; shell=/bin/sh; cwd=/home/tanmay/praman; path=ae264f005049/8 entries
- [x] N2: child interfaces match the contract in PLAN.md
  CHECK: node scripts/verify-node-1.2.mjs
  CWD: /home/tanmay/praman
  EXPECT: node-1.2 interfaces ok
  EVIDENCE: automatic-evidence=v1; definition-sha256=55f5ebaffff14f874c5f4c4b34ee91757417edbb45ab716733e869e0666cf76d; exit=0; EXPECT=matched; output-sha256=611245a4d9fcfc1b6013ef912dd7dbc0e0ddbdac4f1acb14668af203b3607b66; output-bytes=23; shell=/bin/sh; cwd=/home/tanmay/praman; path=ae264f005049/8 entries

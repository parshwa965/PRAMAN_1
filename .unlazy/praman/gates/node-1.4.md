# Gates: node-1.4 integration

Scope: integrate children leaf-1.4.1, leaf-1.4.2, leaf-1.4.3, leaf-1.4.4 into one verified result

- [x] N1: every named direct child is reverified from its exact ledger
  CHECK: node /home/tanmay/.agents/skills/unlazy/scripts/gate-check.mjs --root /home/tanmay/praman --cwd /home/tanmay/praman --reverify --jobs 1 .unlazy/praman/gates/leaf-1.4.1.md .unlazy/praman/gates/leaf-1.4.2.md .unlazy/praman/gates/leaf-1.4.3.md .unlazy/praman/gates/leaf-1.4.4.md
  CWD: /home/tanmay/praman
  EXPECT: ALL MET
  EVIDENCE: automatic-evidence=v1; definition-sha256=2a73b96e374989ea84984c143c6be3d134064646e131638cac266edc258e76e7; exit=0; EXPECT=matched; output-sha256=9f6a12788a7413371e3243f9656360f436f28a9bb36049d68b78487c98a1c7db; output-bytes=3445; shell=/bin/sh; cwd=/home/tanmay/praman; path=ae264f005049/8 entries
- [x] N2: child interfaces match the contract in PLAN.md
  CHECK: node scripts/verify-node-1.4.mjs
  CWD: /home/tanmay/praman
  EXPECT: node-1.4 interfaces ok
  EVIDENCE: automatic-evidence=v1; definition-sha256=a0b494f1c571b6deda468904ceec83af8e370c3ba82db89b9fe28d994fd612d6; exit=0; EXPECT=matched; output-sha256=0ab795b171d3b58f17a63411c64961ceaebc20e656a2549cb0d2b807af669b5b; output-bytes=23; shell=/bin/sh; cwd=/home/tanmay/praman; path=ae264f005049/8 entries

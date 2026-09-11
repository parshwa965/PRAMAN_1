# Gates: node-1.1 integration

Scope: integrate children leaf-1.1.1, leaf-1.1.2, leaf-1.1.3, leaf-1.1.4 into one verified result

- [x] N1: every named direct child is reverified from its exact ledger
  CHECK: node /home/tanmay/.agents/skills/unlazy/scripts/gate-check.mjs --root /home/tanmay/praman --cwd /home/tanmay/praman --reverify --jobs 1 .unlazy/praman/gates/leaf-1.1.1.md .unlazy/praman/gates/leaf-1.1.2.md .unlazy/praman/gates/leaf-1.1.3.md .unlazy/praman/gates/leaf-1.1.4.md
  CWD: /home/tanmay/praman
  EXPECT: ALL MET
  EVIDENCE: automatic-evidence=v1; definition-sha256=3858885f89cccea6f1dff24b6e158f5e4f743f117090d8a8c95a722e088a5cd7; exit=0; EXPECT=matched; output-sha256=d611b8c0c24af00d7e701ca03fcf7081ec3b4e93fc7260ee751ebb22980d3055; output-bytes=4286; shell=/bin/sh; cwd=/home/tanmay/praman; path=ae264f005049/8 entries
- [x] N2: child interfaces match the contract in PLAN.md
  CHECK: node scripts/verify-node-1.1.mjs
  CWD: /home/tanmay/praman
  EXPECT: node-1.1 interfaces ok
  EVIDENCE: automatic-evidence=v1; definition-sha256=36308bcf109367bffe383a949d78694961be99e8f3ff15c6460a7899d20e5d57; exit=0; EXPECT=matched; output-sha256=aaf7c9f89e1b58d0885fca25aead2e8e65805e6c7ba2f7385bd71627f56189a1; output-bytes=23; shell=/bin/sh; cwd=/home/tanmay/praman; path=ae264f005049/8 entries

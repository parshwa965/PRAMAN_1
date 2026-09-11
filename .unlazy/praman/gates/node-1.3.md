# Gates: node-1.3 integration

Scope: integrate children leaf-1.3.1, leaf-1.3.2, leaf-1.3.3 into one verified result

- [x] N1: every named direct child is reverified from its exact ledger
  CHECK: node /home/tanmay/.agents/skills/unlazy/scripts/gate-check.mjs --root /home/tanmay/praman --cwd /home/tanmay/praman --reverify --jobs 1 .unlazy/praman/gates/leaf-1.3.1.md .unlazy/praman/gates/leaf-1.3.2.md .unlazy/praman/gates/leaf-1.3.3.md
  CWD: /home/tanmay/praman
  EXPECT: ALL MET
  EVIDENCE: automatic-evidence=v1; definition-sha256=bf4e0acaf5e7b66a32fcd37cc5c5aee5ceae082dfc5be620c65ed246665da907; exit=0; EXPECT=matched; output-sha256=28bb69b1f60885cc308204423564f1ad6fe784de8afdcaad03362afc6cd83231; output-bytes=1364; shell=/bin/sh; cwd=/home/tanmay/praman; path=ae264f005049/8 entries
- [x] N2: child interfaces match the contract in PLAN.md
  CHECK: node scripts/verify-node-1.3.mjs
  CWD: /home/tanmay/praman
  EXPECT: node-1.3 interfaces ok
  EVIDENCE: automatic-evidence=v1; definition-sha256=d51c0233930433e4f59ccd7e6eb0e4ebddfc624c5167ce58c12f0991b8c996d5; exit=0; EXPECT=matched; output-sha256=5c250db3e674960fbf517cdd9edb2dce6dc826113a6c43f76e6a824784ee67a1; output-bytes=23; shell=/bin/sh; cwd=/home/tanmay/praman; path=ae264f005049/8 entries

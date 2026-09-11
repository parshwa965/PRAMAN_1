# Gates: leaf-1.1.4 seed + fixtures + positive controls

OWNS: api/seeds/**, tests/fixtures/**

Scope: seed + fixtures + positive controls

- [x] G1: seed loads schemes PM-DAKSH/SHRESHTA/e-Anudaan/senior/rehab/hostel + positive fixtures
  CHECK: node scripts/verify-1-1-4.mjs
  CWD: /home/tanmay/praman
  EXPECT: seed verification passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=7ac3bb8a82051ea654251a09efb7234527f96c51bb97d4e19bf639221197517f; exit=0; EXPECT=matched; output-sha256=7047c9d5100979fa74e97e46ab84f0bc0f8c9c146d8ee3f80037eaccef756ef6; output-bytes=25; shell=/bin/sh; cwd=/home/tanmay/praman; path=ae264f005049/8 entries

- [x] G2: positive controls for negative tests exist (known duplicate pair, ghost, spoof)
  CHECK: node scripts/verify-1-1-4-controls.mjs
  CWD: /home/tanmay/praman
  EXPECT: controls verification passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=1d34ee982975505258b07686b6815ee0eb0145e6cc337267cf71bfde6e25fd5d; exit=0; EXPECT=matched; output-sha256=6a2f7184567acb076d45199213bd918036a6cbde79c6eb5bcae87c28ab732353; output-bytes=29; shell=/bin/sh; cwd=/home/tanmay/praman; path=ae264f005049/8 entries

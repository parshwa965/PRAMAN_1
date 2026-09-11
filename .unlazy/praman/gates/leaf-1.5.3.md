# Gates: leaf-1.5.3 e2e fraud scenarios

OWNS: tests/e2e/**

Scope: e2e fraud scenarios

- [x] G1: proxy attendance blocked
  CHECK: node scripts/verify-1-5-3-proxy.mjs
  CWD: /home/tanmay/praman
  EXPECT: proxy verification passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=5773eb6ecdc4c7f44c46e21b9f22ea495b61d2f7980ea7bde3da425fa4323a06; exit=0; EXPECT=matched; output-sha256=fd28eb8435efabffa9cc131297ab2ad2bac9666f94599eeb51dbcb899446dd80; output-bytes=26; shell=/bin/sh; cwd=/home/tanmay/praman; path=ae264f005049/8 entries

- [x] G2: recycled photo flagged
  CHECK: node scripts/verify-1-5-3-recycled.mjs
  CWD: /home/tanmay/praman
  EXPECT: recycled verification passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=c5f9fb029c1c9de8fed1e5f393b5a868286606a0732897effb33d30063737792; exit=0; EXPECT=matched; output-sha256=80422edd94a85d9fbf565edd70079ebbe4c3a84b58b043f4984344ce3b476319; output-bytes=29; shell=/bin/sh; cwd=/home/tanmay/praman; path=ae264f005049/8 entries

- [x] G3: spoof GPS rejected
  CHECK: node scripts/verify-1-5-3-gps.mjs
  CWD: /home/tanmay/praman
  EXPECT: gps-spoof verification passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=5599ed7a05e65d7cbb769dbba0e45b2a37ba350e2a23166d46fa9f102e822d42; exit=0; EXPECT=matched; output-sha256=04e3cc054d765c60c67c0ce48bb2de9ccc66abdd4fb121ca50a0249b0334acc9; output-bytes=30; shell=/bin/sh; cwd=/home/tanmay/praman; path=ae264f005049/8 entries

- [x] G4: colluding inspector assignment refused
  CHECK: node scripts/verify-1-5-3-collude.mjs
  CWD: /home/tanmay/praman
  EXPECT: collude verification passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=0e047eefad7a30196eab82042573381dd3b6fab1a9116cb8b675ffec9c42c81b; exit=0; EXPECT=matched; output-sha256=950d687183e3ae474ec1c8c2b5288302e48d8fe571b1dc782c558afe068e9f41; output-bytes=28; shell=/bin/sh; cwd=/home/tanmay/praman; path=ae264f005049/8 entries

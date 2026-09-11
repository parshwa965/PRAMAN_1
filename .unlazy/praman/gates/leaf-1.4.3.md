# Gates: leaf-1.4.3 anomaly AI

OWNS: api/anomaly/**

Scope: anomaly AI

- [x] G1: duplicate image detector flags recycled photo across years
  CHECK: node scripts/verify-1-4-3-dup.mjs
  CWD: /home/tanmay/praman
  EXPECT: dup verification passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=02bf67be16fd2e4e8f6fd6aff15e4b05414e883431afe2f782f69cd4799563e1; exit=0; EXPECT=matched; output-sha256=6a25fb154e140b0e26575da565889c73f01b358b6767e5f080ee4c1550b097a4; output-bytes=24; shell=/bin/sh; cwd=/home/tanmay/praman; path=ae264f005049/8 entries

- [x] G2: headcount-vs-claim + mortality/discharge cross-check
  CHECK: node scripts/verify-1-4-3-headcount.mjs
  CWD: /home/tanmay/praman
  EXPECT: headcount verification passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=23729a2fe35c186511fd096b5e9c5d5eca54837401d14542958772b8ecfe669d; exit=0; EXPECT=matched; output-sha256=dd910435a68c26a6e9b74efafba165f9829bbd38ba59366fe6d9830944f6dc78; output-bytes=30; shell=/bin/sh; cwd=/home/tanmay/praman; path=ae264f005049/8 entries

- [x] G3: fund-vs-physical gap + heartbeat gap detectors
  CHECK: node scripts/verify-1-4-3-gap.mjs
  CWD: /home/tanmay/praman
  EXPECT: gap verification passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=152ef94f0c23f6f45aadf246d808f4802e9c093a7f136f8e398f3545b7dd9cad; exit=0; EXPECT=matched; output-sha256=b61ae2935411a2ab85bd7491f62d5c031851ac97a47604857533fc19728dc396; output-bytes=24; shell=/bin/sh; cwd=/home/tanmay/praman; path=ae264f005049/8 entries

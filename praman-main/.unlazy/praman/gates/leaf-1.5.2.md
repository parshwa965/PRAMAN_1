# Gates: leaf-1.5.2 security + perf

OWNS: api/security/**

Scope: security + perf

- [x] G1: rate-limit + validation + PII masking + signed CCTV URLs
  CHECK: node scripts/verify-1-5-2.mjs
  CWD: /home/tanmay/praman
  EXPECT: security verification passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=f76d1349b4d601a6fbc05ad196a5fa61bebe57cb7015b27aabcb213ca646614e; exit=0; EXPECT=matched; output-sha256=815363f9e5720aa8147a1eee31527094f603dd1d6c00974e01efa76e1ab9077f; output-bytes=29; shell=/bin/sh; cwd=/home/tanmay/praman; path=ae264f005049/8 entries

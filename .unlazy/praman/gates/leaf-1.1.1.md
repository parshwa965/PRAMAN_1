# Gates: leaf-1.1.1 monorepo scaffold + toolchain pin

OWNS: package.json, README.md, scripts/**, docs/TOOLCHAIN.md

Scope: monorepo scaffold + toolchain pin

- [x] G1: monorepo scaffold exists with web/mobile/api dirs
  CHECK: node scripts/verify-1-1-1.mjs
  CWD: /home/tanmay/praman
  EXPECT: scaffold verification passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=419c0d496ecc225e626239ad0e3d159f64d582a9370271c0e9e5644169f0bace; exit=0; EXPECT=matched; output-sha256=487fc0e920693d15b1bd4fd1b8faa619888a9d658b0be41364cd022b7c9a3739; output-bytes=29; shell=/bin/sh; cwd=/home/tanmay/praman; path=ae264f005049/8 entries

- [x] G2: toolchain pinned node/python versions documented
  CHECK: node scripts/verify-1-1-1-toolchain.mjs
  CWD: /home/tanmay/praman
  EXPECT: toolchain verification passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=9398a7db5108a0339e6e388f82c86f163e559040e9a0f6c28a8b568761ae0fd5; exit=0; EXPECT=matched; output-sha256=67012b446d3896e7b16a00bc85cb3dc586b5c3c42f5a3c8a253bdba86a6944fb; output-bytes=30; shell=/bin/sh; cwd=/home/tanmay/praman; path=ae264f005049/8 entries

- [x] G3: verify harness portable (no banned placeholders in scaffold)
  CHECK: node scripts/verify-1-1-1-clean.mjs
  CWD: /home/tanmay/praman
  EXPECT: clean verification passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=13ac5cbe3ebce08b9a6e2174594e1321fec059683c8363aa20e0c7eb77058dfa; exit=0; EXPECT=matched; output-sha256=312cf5a9e2d4ce99c38c2327b5f4183088ea8b44900c55ccb412890ac565608b; output-bytes=26; shell=/bin/sh; cwd=/home/tanmay/praman; path=ae264f005049/8 entries

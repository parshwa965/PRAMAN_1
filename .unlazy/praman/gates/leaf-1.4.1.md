# Gates: leaf-1.4.1 anti-spoof evidence service

OWNS: api/evidence/**

Scope: anti-spoof evidence service

- [x] G1: live-only enforced, gallery upload rejected (negative+positive control)
  CHECK: node scripts/verify-1-4-1.mjs
  CWD: /home/tanmay/praman
  EXPECT: evidence verification passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=116f65259ed79d4aa2b0bb87c3b9eb4a88b9107b4848a275cbeb180df7810dc3; exit=0; EXPECT=matched; output-sha256=c2497ecd1264dbf917441cd8932234b7fd80ba94b350ea341003342669dce514; output-bytes=29; shell=/bin/sh; cwd=/home/tanmay/praman; path=ae264f005049/8 entries

- [x] G2: GPS plausibility + time-drift + EXIF strip + phash dup detection
  CHECK: node scripts/verify-1-4-1-spoof.mjs
  CWD: /home/tanmay/praman
  EXPECT: spoof verification passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=e4f6981c524915af108f6e7afe60bdc8924bb5b055b3e420807a42ea3c6aac13; exit=0; EXPECT=matched; output-sha256=a86b37ef59c87f5ac8591b12581a12c8ba619fa19f8fc6744d92bbed8295a9e6; output-bytes=26; shell=/bin/sh; cwd=/home/tanmay/praman; path=ae264f005049/8 entries

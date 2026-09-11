# Gates: leaf-1.3.2 inspection checklist + live-only capture

OWNS: mobile/lib/inspection/**

Scope: inspection checklist + live-only capture

- [x] G1: live-only camera rejects gallery + OS GPS + server-time sign
  CHECK: node scripts/verify-1-3-2.mjs
  CWD: /home/tanmay/praman
  EXPECT: inspection verification passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=563f4d02e49dd6b7a7f89a6a79138de27769a9bd18c34a33e0ac1d019660818b; exit=0; EXPECT=matched; output-sha256=03c23585a7233f03adc555cc7186b1022e279c62e65328ff7aac5f8b94ceb187; output-bytes=31; shell=/bin/sh; cwd=/home/tanmay/praman; path=ae264f005049/8 entries

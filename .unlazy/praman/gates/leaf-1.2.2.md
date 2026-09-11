# Gates: leaf-1.2.2 anomaly inbox

OWNS: web/app/anomalies/**

Scope: anomaly inbox

- [x] G1: anomaly inbox lists duplicate/headcount/mortality/heartbeat/fund-gap with evidence links
  CHECK: node scripts/verify-1-2-2.mjs
  CWD: /home/tanmay/praman
  EXPECT: inbox verification passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=26e7004e18cbbb575ff0eacf02a2c413e88da9fa24da2fdf1863da92583b596a; exit=0; EXPECT=matched; output-sha256=558c5d7dffdbe072d4876b334d398cfcee12a324a0abee585add3982cd9a6c84; output-bytes=26; shell=/bin/sh; cwd=/home/tanmay/praman; path=ae264f005049/8 entries

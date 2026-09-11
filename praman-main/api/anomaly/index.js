export function hamming(a, b) {
  const x = BigInt('0x' + String(a || '0')) ^ BigInt('0x' + String(b || '0'));
  let n = x < 0n ? -x : x, c = 0;
  while (n) { c += Number(n & 1n); n >>= 1n; }
  return c;
}
const yr = (e) => {
  const v = e?.year ?? e?.server_ts ?? e?.serverTs ?? e?.device_ts ?? e?.deviceTs ?? e?.createdAt ?? e?.ts;
  if (typeof v === 'number') return v < 2500 ? v : new Date(v).getFullYear();
  const y = new Date(v ?? '').getFullYear();
  return Number.isNaN(y) ? NaN : y;
};
const id = (e, f) => e?.id ?? e?.evidence_id ?? f;
const hash = (e) => e?.phash ?? e?.pHash ?? e?.hash ?? e?.perceptual_hash;

// duplicate image detector: pairwise phash hamming, flags recycled photo across years
export function findDuplicates(evidenceList = [], threshold = 5) {
  const out = [];
  for (let i = 0; i < evidenceList.length; i++) for (let j = i + 1; j < evidenceList.length; j++) {
    const a = evidenceList[i], b = evidenceList[j];
    const ha = hash(a), hb = hash(b);
    if (ha == null || hb == null) continue;
    const distance = hamming(ha, hb);
    if (distance <= (threshold ?? 5)) {
      const ya = yr(a), yb = yr(b);
      out.push({ a: id(a, i), b: id(b, j), distance, phash: [ha, hb], duplicate: true, yearsApart: (Number.isNaN(ya) || Number.isNaN(yb)) ? 0 : Math.abs(ya - yb) });
    }
  }
  return out;
}

// headcount-vs-claim: claimed beneficiaries vs actual attendance -> proxy attendance
export function headcountAnomaly(claimed, actualAttendanceList) {
  const actual = Array.isArray(actualAttendanceList) ? actualAttendanceList.length : Number(actualAttendanceList ?? 0);
  const c = Number(claimed ?? 0);
  if (c > actual * 1.2) return { flagged: true, type: 'headcount', claimed: c, actual, gap: c - actual };
  return { flagged: false, type: 'headcount', claimed: c, actual, gap: Math.max(0, c - actual) };
}

// mortality/discharge cross-check: claims against dead/discharged beneficiaries
export function mortalityCheck(beneficiaries = [], claims = []) {
  const dead = new Set(beneficiaries.filter((b) => /dead|deceas|discharg|mortal/i.test(String(b?.status ?? ''))).map((b) => String(b?.id ?? b?.beneficiaryId ?? b?.beneficiary_id)));
  return (claims ?? []).filter((c) => dead.has(String(c?.beneficiaryId ?? c?.beneficiary_id ?? c?.id))).map((c) => ({ type: 'mortality', claimId: c?.id ?? c?.claimId, beneficiaryId: c?.beneficiaryId ?? c?.beneficiary_id }));
}

// heartbeat gap: facilities silent beyond threshold
export function heartbeatGap(facilities = [], nowMs = Date.now(), thresholdHrs = 24) {
  const now = Number(nowMs ?? Date.now());
  const ms = (thresholdHrs ?? 24) * 3600e3;
  return (facilities ?? []).filter((f) => {
    const last = Date.parse(f?.lastHeartbeat ?? f?.last_heartbeat ?? f?.lastSeen ?? f?.last_seen ?? 0);
    return Number.isNaN(last) || now - last > ms;
  }).map((f) => ({ type: 'heartbeat', id: f?.id ?? f?.facilityId, lastHeartbeat: f?.lastHeartbeat ?? f?.last_heartbeat ?? null, gapHrs: (() => { const t = Date.parse(f?.lastHeartbeat ?? f?.last_heartbeat ?? f?.lastSeen ?? 0); return Number.isNaN(t) ? Infinity : (now - t) / 3600e3; })() }));
}

// fund-vs-physical gap: financial 100% but physical <40%
export function fundGap(grants = []) {
  return (grants ?? []).map((g) => {
    const released = Number(g?.released ?? g?.financialProgress ?? (g?.utilized != null && g?.sanctioned != null ? g.utilized : NaN));
    const sanctioned = Number(g?.sanctioned ?? released);
    const utilized = Number(g?.utilized ?? released);
    const physical = Number(g?.physicalProgress ?? g?.physical_progress ?? g?.physical ?? 0);
    const fin = Number.isFinite(released) && sanctioned > 0 ? (g?.financialProgress ?? (utilized / sanctioned) * 100) : Number(g?.financialProgress ?? 100);
    const gapPct = fin - physical;
    return { g, fin, physical, gapPct };
  }).filter(({ fin, physical }) => fin >= 99 && physical < 40)
    .map(({ g, fin, physical, gapPct }) => ({ type: 'fund-gap', id: g?.id ?? g?.grantId, fund: { released: g?.released, utilized: g?.utilized }, financialPct: fin, physicalPct: physical, gapPct }));
}

export function scoreAll(input = {}) {
  const dups = findDuplicates(input.evidence ?? input.evidenceList ?? [], input.threshold);
  const head = headcountAnomaly(input.claimed, input.actual ?? input.actualAttendanceList ?? input.attendance);
  const mort = mortalityCheck(input.beneficiaries ?? [], input.claims ?? []);
  const beat = heartbeatGap(input.facilities ?? [], input.nowMs, input.thresholdHrs);
  const fund = fundGap(input.grants ?? []);
  const flags = [dups.length > 0, head.flagged, mort.length > 0, beat.length > 0, fund.length > 0];
  const score = flags.filter(Boolean).length / 5;
  return { duplicates: dups, headcount: head, mortality: mort, heartbeat: beat, fundGap: fund, score };
}

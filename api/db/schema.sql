-- Praman data model (SQLite-compatible DDL; JSON store mirrors these tables).
-- Schemes: PM-DAKSH, SHRESHTA, e-Anudaan, senior-homes, rehab, hostels.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS facility (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  district TEXT NOT NULL,
  state TEXT NOT NULL,
  type TEXT NOT NULL,
  lat REAL NOT NULL,
  lon REAL NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity >= 0)
);

CREATE TABLE IF NOT EXISTS beneficiary (
  id TEXT PRIMARY KEY,
  name_hash TEXT NOT NULL,
  aadhaar_masked TEXT NOT NULL,
  dob TEXT NOT NULL,
  scheme TEXT NOT NULL CHECK (scheme IN ('PM-DAKSH','SHRESHTA','e-Anudaan','senior-homes','rehab','hostels')),
  facility_id TEXT REFERENCES facility(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('alive','dead','discharged')),
  face_hash TEXT
);

CREATE TABLE IF NOT EXISTS grant (
  id TEXT PRIMARY KEY,
  facility_id TEXT NOT NULL REFERENCES facility(id) ON DELETE CASCADE,
  scheme TEXT NOT NULL CHECK (scheme IN ('PM-DAKSH','SHRESHTA','e-Anudaan','senior-homes','rehab','hostels')),
  sanctioned REAL NOT NULL CHECK (sanctioned >= 0),
  released REAL NOT NULL DEFAULT 0 CHECK (released >= 0),
  utilized REAL NOT NULL DEFAULT 0 CHECK (utilized >= 0),
  stage TEXT NOT NULL DEFAULT 'sanctioned' CHECK (stage IN ('sanctioned','released','mid','complete'))
);

CREATE TABLE IF NOT EXISTS inspection (
  id TEXT PRIMARY KEY,
  facility_id TEXT NOT NULL REFERENCES facility(id) ON DELETE CASCADE,
  inspector_id TEXT NOT NULL,
  token TEXT NOT NULL,
  window_start TEXT NOT NULL,
  window_end TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','open','submitted','verified','flagged')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE IF NOT EXISTS evidence (
  id TEXT PRIMARY KEY,
  inspection_id TEXT NOT NULL REFERENCES inspection(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('photo','attendance','doc')),
  sha256 TEXT NOT NULL,
  phash TEXT NOT NULL,
  lat REAL NOT NULL,
  lon REAL NOT NULL,
  server_ts TEXT NOT NULL,
  device_ts TEXT NOT NULL,
  gps_source TEXT NOT NULL CHECK (gps_source IN ('os','network')),
  exif_stripped INTEGER NOT NULL DEFAULT 1 CHECK (exif_stripped IN (0,1))
);

CREATE TABLE IF NOT EXISTS assignment (
  id TEXT PRIMARY KEY,
  inspector_id TEXT NOT NULL,
  facility_id TEXT NOT NULL REFERENCES facility(id) ON DELETE CASCADE,
  district TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  cooling_until TEXT NOT NULL,
  token_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS vc_log (
  id TEXT PRIMARY KEY,
  from_role TEXT NOT NULL,
  to_user TEXT,
  facility_id TEXT REFERENCES facility(id) ON DELETE SET NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  outcome TEXT NOT NULL CHECK (outcome IN ('completed','missed','rejected','scheduled'))
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  ts TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  hash_chain TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_beneficiary_facility ON beneficiary(facility_id);
CREATE INDEX IF NOT EXISTS idx_beneficiary_scheme ON beneficiary(scheme);
CREATE INDEX IF NOT EXISTS idx_beneficiary_status ON beneficiary(status);
CREATE INDEX IF NOT EXISTS idx_grant_facility ON grant(facility_id);
CREATE INDEX IF NOT EXISTS idx_grant_scheme ON grant(scheme);
CREATE INDEX IF NOT EXISTS idx_inspection_facility ON inspection(facility_id);
CREATE INDEX IF NOT EXISTS idx_inspection_inspector ON inspection(inspector_id);
CREATE INDEX IF NOT EXISTS idx_inspection_status ON inspection(status);
CREATE INDEX IF NOT EXISTS idx_evidence_inspection ON evidence(inspection_id);
CREATE INDEX IF NOT EXISTS idx_evidence_phash ON evidence(phash);
CREATE INDEX IF NOT EXISTS idx_evidence_sha256 ON evidence(sha256);
CREATE INDEX IF NOT EXISTS idx_assignment_inspector ON assignment(inspector_id);
CREATE INDEX IF NOT EXISTS idx_assignment_facility ON assignment(facility_id);
CREATE INDEX IF NOT EXISTS idx_assignment_district ON assignment(district);
CREATE INDEX IF NOT EXISTS idx_vc_facility ON vc_log(facility_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit_log(ts);

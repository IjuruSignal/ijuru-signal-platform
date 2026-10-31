CREATE TABLE evidence_records (
  id TEXT PRIMARY KEY,
  area_id TEXT NOT NULL REFERENCES areas(id),
  kind TEXT NOT NULL CHECK(kind IN ('forecast','satellite','rainfall_history')),
  source_id TEXT NOT NULL,
  source_version TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  valid_until TEXT NOT NULL,
  is_fixture INTEGER NOT NULL CHECK(is_fixture IN (0,1)),
  record_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX evidence_area_kind_time ON evidence_records(area_id, kind, observed_at DESC, id DESC);

CREATE TABLE area_boundaries (
  area_id TEXT NOT NULL REFERENCES areas(id),
  version TEXT NOT NULL,
  geometry_json TEXT NOT NULL,
  provenance_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY(area_id, version)
);

CREATE TABLE area_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  area_id TEXT NOT NULL REFERENCES areas(id),
  updated_at TEXT NOT NULL
);

CREATE TABLE areas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  boundary_geojson TEXT,
  boundary_source TEXT,
  boundary_version TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK(role IN ('user','reviewer','admin')),
  created_at TEXT NOT NULL
);

CREATE TABLE area_access (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  area_id TEXT NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  PRIMARY KEY(user_id, area_id)
);

CREATE TABLE field_checks (
  id TEXT PRIMARY KEY,
  area_id TEXT NOT NULL REFERENCES areas(id),
  author_id TEXT NOT NULL REFERENCES users(id),
  observation TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending','reviewed')),
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE audit_events (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  object_id TEXT NOT NULL,
  outcome TEXT NOT NULL,
  trace_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);

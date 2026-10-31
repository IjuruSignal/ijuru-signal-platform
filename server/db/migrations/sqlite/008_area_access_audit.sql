CREATE TABLE area_access_audit (
 event_id TEXT PRIMARY KEY REFERENCES audit_events(id),
 area_id TEXT NOT NULL REFERENCES areas(id)
);

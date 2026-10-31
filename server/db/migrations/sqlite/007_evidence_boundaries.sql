-- Existing records remain intact but have no inferred boundary. Reads treat
-- them as provenance-missing until a new, properly sourced record is ingested.
CREATE UNIQUE INDEX evidence_id_area ON evidence_records(id,area_id);
CREATE TABLE evidence_boundary_refs (
 evidence_id TEXT PRIMARY KEY,
 area_id TEXT NOT NULL,
 boundary_version TEXT NOT NULL,
 FOREIGN KEY(evidence_id,area_id) REFERENCES evidence_records(id,area_id),
 FOREIGN KEY(area_id,boundary_version) REFERENCES area_boundaries(area_id,version)
);

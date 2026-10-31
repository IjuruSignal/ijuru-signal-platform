import { validateEvidence, evidenceState } from '../domain/record.mjs';

// Trusted ingest code only; authorization must be enforced at its caller.
// Immutable IDs prevent accidentally rewriting an already cited observation.
export function insertEvidence(db, input, now = new Date()) {
 const record = validateEvidence(input);
 if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new Error('Invalid time');
 const json = JSON.stringify(record);
 db.exec('BEGIN IMMEDIATE');
 try {
  const boundary = db.prepare('SELECT provenance_json FROM area_boundaries WHERE area_id=? AND version=?').get(record.areaId,record.boundaryVersion);
  if (!boundary) throw new Error('Boundary not found');
  const provenance = JSON.parse(boundary.provenance_json);
  if (typeof provenance.fixture !== 'boolean' || (provenance.fixture && !record.fixture)) throw new Error('Invalid boundary provenance');
  db.prepare('INSERT INTO evidence_records (id,area_id,kind,source_id,source_version,observed_at,valid_until,is_fixture,record_json,created_at) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').run(record.id,record.areaId,record.kind,record.source.id,record.source.version,record.observedAt,record.validUntil,record.fixture ? 1 : 0,json,now.toISOString());
  const existing = db.prepare('SELECT record_json FROM evidence_records WHERE id=?').get(record.id);
  if (existing.record_json !== json) throw new Error('Evidence id conflict');
  db.prepare('INSERT INTO evidence_boundary_refs (evidence_id,area_id,boundary_version) VALUES (?,?,?) ON CONFLICT(evidence_id) DO NOTHING').run(record.id,record.areaId,record.boundaryVersion);
  const ref = db.prepare('SELECT area_id,boundary_version FROM evidence_boundary_refs WHERE evidence_id=?').get(record.id);
  if (ref.area_id !== record.areaId || ref.boundary_version !== record.boundaryVersion) throw new Error('Boundary reference conflict');
  db.exec('COMMIT');
  return record.id;
 } catch (error) { db.exec('ROLLBACK'); throw error; }
}

// Returns the latest record for each kind, including stale records; older rows
// without boundary provenance are explicitly unavailable for use.
export function getEvidenceBrief(db, areaId, now = new Date()) {
 if (typeof areaId !== 'string' || !areaId || !(now instanceof Date) || !Number.isFinite(now.getTime())) throw new Error('Invalid query');
 if (!db.prepare('SELECT 1 FROM areas WHERE id=?').get(areaId)) return null;
 const evidence = {};
 for (const kind of ['forecast','satellite','rainfall_history']) {
  const row = db.prepare('SELECT e.record_json,r.area_id AS boundary_area,r.boundary_version,b.provenance_json FROM evidence_records e LEFT JOIN evidence_boundary_refs r ON r.evidence_id=e.id LEFT JOIN area_boundaries b ON b.area_id=r.area_id AND b.version=r.boundary_version WHERE e.area_id=? AND e.kind=? ORDER BY e.observed_at DESC,e.id DESC LIMIT 1').get(areaId,kind);
  if (!row) { evidence[kind] = {status:'unavailable',record:null}; continue; }
  if (!row.boundary_version || row.boundary_area !== areaId || !row.provenance_json) { evidence[kind] = {status:'provenance_missing',record:null}; continue; }
  const record = validateEvidence(JSON.parse(row.record_json));
  if (record.areaId !== areaId || record.boundaryVersion !== row.boundary_version) throw new Error('Boundary reference conflict');
  const boundary = JSON.parse(row.provenance_json);
  if (boundary.version !== row.boundary_version || typeof boundary.fixture !== 'boolean' || (boundary.fixture && !record.fixture)) throw new Error('Invalid boundary provenance');
  evidence[kind] = {status:evidenceState(record,now),record,boundary};
 }
 return evidence;
}

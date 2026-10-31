import { randomUUID } from 'node:crypto';

// Callers must supply an identity established by a trusted authentication layer.
// These functions are not exposed through HTTP until that layer exists.
function actor(db, actorId, areaId) {
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(actorId);
  if (!user) throw new Error('Forbidden');
  if (user.role !== 'admin' && !db.prepare('SELECT 1 FROM area_access WHERE user_id = ? AND area_id = ?').get(actorId, areaId)) throw new Error('Forbidden');
  return user;
}
function audit(db, actorId, action, id, traceId, time) {
  db.prepare('INSERT INTO audit_events VALUES (?, ?, ?, ?, ?, ?, ?)').run(randomUUID(), actorId, action, id, 'success', traceId, time);
}
export function createFieldCheck(db, input) {
  if (typeof input.observation !== 'string' || !input.observation.trim() || input.observation.length > 4000 || !Number.isFinite(Date.parse(input.observedAt)) || !input.traceId) throw new Error('Invalid input');
  const id = randomUUID(), now = new Date().toISOString();
  db.exec('BEGIN IMMEDIATE');
  try {
    actor(db, input.actorId, input.areaId);
    db.prepare('INSERT INTO field_checks VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, input.areaId, input.actorId, input.observation.trim(), new Date(input.observedAt).toISOString(), 'pending', 1, now, now);
    audit(db, input.actorId, 'field_check.create', id, input.traceId, now);
    db.exec('COMMIT'); return id;
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}
export function getFieldCheck(db, actorId, id) {
  const row = db.prepare('SELECT * FROM field_checks WHERE id = ?').get(id);
  if (!row) return null;
  const user = actor(db, actorId, row.area_id);
  if (user.role === 'user' && row.author_id !== actorId) throw new Error('Forbidden');
  return row;
}
export function reviewFieldCheck(db, {actorId, id, version, traceId}) {
  if (!traceId || !Number.isInteger(version)) throw new Error('Invalid input');
  db.exec('BEGIN IMMEDIATE');
  try {
    const row = getFieldCheck(db, actorId, id);
    if (!row) throw new Error('Not found');
    const user = actor(db, actorId, row.area_id);
    if (!['reviewer', 'admin'].includes(user.role)) throw new Error('Forbidden');
    const now = new Date().toISOString();
    const result = db.prepare("UPDATE field_checks SET status = 'reviewed', version = version + 1, updated_at = ? WHERE id = ? AND version = ? AND status = 'pending'").run(now, id, version);
    if (result.changes !== 1) throw new Error('Conflict');
    audit(db, actorId, 'field_check.review', id, traceId, now);
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}

// Lists only the actor's own records for users, and assigned-area records for
// reviewers. Notes are returned only after the same area authorization as reads.
export function listFieldChecks(db, {actorId, areaId, status, limit = 50}) {
  const user = actor(db, actorId, areaId);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100 || (status !== undefined && !['pending','reviewed'].includes(status))) throw new Error('Invalid input');
  return db.prepare('SELECT * FROM field_checks WHERE area_id=? AND (? IS NULL OR status=?) AND (? != ? OR author_id=?) ORDER BY created_at DESC, id DESC LIMIT ?').all(areaId,status ?? null,status ?? null,user.role,'user',actorId,limit);
}

export function updateFieldCheck(db, {actorId, id, version, observation, observedAt, traceId}) {
  if (!Number.isInteger(version) || version < 1 || typeof observation !== 'string' || !observation.trim() || observation.length > 4000 || !Number.isFinite(Date.parse(observedAt)) || !traceId) throw new Error('Invalid input');
  db.exec('BEGIN IMMEDIATE');
  try {
    const row = getFieldCheck(db, actorId, id);
    if (!row) throw new Error('Not found');
    // Even reviewers and administrators cannot rewrite another person's note.
    if (row.author_id !== actorId) throw new Error('Forbidden');
    const now = new Date().toISOString();
    const change = db.prepare("UPDATE field_checks SET observation=?, observed_at=?, version=version+1, updated_at=? WHERE id=? AND version=? AND status='pending'").run(observation.trim(),new Date(observedAt).toISOString(),now,id,version);
    if (change.changes !== 1) throw new Error('Conflict');
    audit(db,actorId,'field_check.update',id,traceId,now);
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}

export function deleteFieldCheck(db, {actorId, id, version, traceId}) {
  if (!Number.isInteger(version) || version < 1 || !traceId) throw new Error('Invalid input');
  db.exec('BEGIN IMMEDIATE');
  try {
    const row = getFieldCheck(db, actorId, id);
    if (!row) throw new Error('Not found');
    if (row.author_id !== actorId) throw new Error('Forbidden');
    const change = db.prepare("DELETE FROM field_checks WHERE id=? AND version=? AND status='pending'").run(id,version);
    if (change.changes !== 1) throw new Error('Conflict');
    audit(db,actorId,'field_check.delete',id,traceId,new Date().toISOString());
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}

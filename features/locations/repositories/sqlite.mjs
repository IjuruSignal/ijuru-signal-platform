import { randomUUID } from 'node:crypto';
import { validateBoundary } from '../domain/boundary.mjs';
function actor(db,id) {
 const user = db.prepare('SELECT id,role FROM users WHERE id=?').get(id);
 if (!user) throw new Error('Forbidden');
 return user;
}
function authorizeArea(db,user,areaId) {
 if (user.role !== 'admin' && !db.prepare('SELECT 1 FROM area_access WHERE user_id=? AND area_id=?').get(user.id,areaId)) throw new Error('Forbidden');
 if (!db.prepare('SELECT 1 FROM areas WHERE id=?').get(areaId)) throw new Error('Not found');
}
function audit(db,actorId,action,id,traceId,now) {
 db.prepare('INSERT INTO audit_events VALUES (?,?,?,?,?,?,?)').run(randomUUID(),actorId,action,id,'success',traceId,now);
}
// Administrative callers must authenticate actorId before invoking these methods.
export function createArea(db,{actorId,id,name,traceId}) {
 if (![id,name,traceId].every(x => typeof x === 'string' && x.trim() === x && x.length > 0 && x.length <= 200)) throw new Error('Invalid input');
 db.exec('BEGIN IMMEDIATE');
 try {
  if (actor(db,actorId).role !== 'admin') throw new Error('Forbidden');
  const now = new Date().toISOString();
  db.prepare('INSERT INTO areas (id,name,created_at) VALUES (?,?,?)').run(id,name,now);
  audit(db,actorId,'area.create',id,traceId,now);
  db.exec('COMMIT');
 } catch (error) { db.exec('ROLLBACK'); throw error; }
}
export function addBoundary(db,{actorId,areaId,boundary,traceId}) {
 if (typeof traceId !== 'string' || !traceId || traceId.length > 200) throw new Error('Invalid input');
 const parsed = validateBoundary(boundary);
 const {geometry,...provenance} = parsed;
 db.exec('BEGIN IMMEDIATE');
 try {
  if (actor(db,actorId).role !== 'admin') throw new Error('Forbidden');
  const now = new Date().toISOString();
  db.prepare('INSERT INTO area_boundaries VALUES (?,?,?,?,?)').run(areaId,parsed.version,JSON.stringify(geometry),JSON.stringify(provenance),now);
  audit(db,actorId,'area.boundary_add',areaId,traceId,now);
  db.exec('COMMIT');
 } catch (error) { db.exec('ROLLBACK'); throw error; }
}
export function selectArea(db,{actorId,areaId}) {
 db.exec('BEGIN IMMEDIATE');
 try {
  const user = actor(db,actorId); authorizeArea(db,user,areaId);
  db.prepare('INSERT INTO area_preferences VALUES (?,?,?) ON CONFLICT(user_id) DO UPDATE SET area_id=excluded.area_id,updated_at=excluded.updated_at').run(actorId,areaId,new Date().toISOString());
  db.exec('COMMIT');
 } catch (error) { db.exec('ROLLBACK'); throw error; }
}
export function selectedArea(db,actorId) {
 const user = actor(db,actorId);
 const row = db.prepare('SELECT areas.id,areas.name FROM area_preferences JOIN areas ON areas.id=area_preferences.area_id WHERE area_preferences.user_id=?').get(actorId);
 if (!row) return null;
 // An earlier selection does not preserve access after a grant is revoked.
 if (user.role !== 'admin' && !db.prepare('SELECT 1 FROM area_access WHERE user_id=? AND area_id=?').get(actorId,row.id)) return null;
 return {id:row.id,name:row.name};
}
export function listAreas(db,actorId) {
 const user = actor(db,actorId);
 return user.role === 'admin' ? db.prepare('SELECT id,name FROM areas ORDER BY name,id').all() : db.prepare('SELECT areas.id,areas.name FROM areas JOIN area_access ON area_access.area_id=areas.id WHERE area_access.user_id=? ORDER BY areas.name,areas.id').all(actorId);
}

import { randomUUID } from 'node:crypto';

// Canonical UTC timestamps make SQLite's text ordering chronological.
function instant(value) {
 if (typeof value !== 'string' || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) throw new Error('Invalid timestamp');
 return value;
}
function boundedString(value, max) { return typeof value === 'string' && value.length > 0 && value.length <= max; }
function json(value) {
 const encoded = JSON.stringify(value);
 if (typeof encoded !== 'string' || Buffer.byteLength(encoded) > 65536) throw new Error('Invalid job data');
 return encoded;
}
export function enqueue(db, {kind, payload, idempotencyKey, maxAttempts = 3, now = new Date().toISOString()}) {
 instant(now);
 if (!boundedString(kind, 100) || !boundedString(idempotencyKey, 200) || !Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 10) throw new Error('Invalid job');
 const encoded = json(payload), id = randomUUID();
 db.prepare("INSERT INTO jobs (id,kind,payload,status,idempotency_key,max_attempts,created_at,updated_at,available_at) VALUES (?,?,?,'queued',?,?,?,?,?) ON CONFLICT(idempotency_key) DO NOTHING").run(id,kind,encoded,idempotencyKey,maxAttempts,now,now,now);
 const job = db.prepare('SELECT id, kind, payload, max_attempts FROM jobs WHERE idempotency_key = ?').get(idempotencyKey);
 if (job.kind !== kind || job.payload !== encoded || job.max_attempts !== maxAttempts) throw new Error('Idempotency key conflict');
 return job.id;
}
export function claim(db, workerId, now, leaseMs = 30000) {
 instant(now);
 if (!boundedString(workerId, 200) || !Number.isSafeInteger(leaseMs) || leaseMs < 1 || leaseMs > 3600000) throw new Error('Invalid lease');
 const leaseUntil = new Date(Date.parse(now) + leaseMs).toISOString();
 db.exec('BEGIN IMMEDIATE');
 try {
  db.prepare("UPDATE jobs SET status = 'failed', worker_id = NULL, lease_until = NULL, error_code = 'lease_expired', updated_at = ? WHERE status = 'leased' AND lease_until <= ? AND attempt >= max_attempts").run(now,now);
  const job = db.prepare("SELECT * FROM jobs WHERE ((status = 'queued' AND available_at <= ?) OR (status = 'leased' AND lease_until <= ?)) AND attempt < max_attempts ORDER BY created_at, id LIMIT 1").get(now,now);
  if (!job) { db.exec('COMMIT'); return null; }
  db.prepare("UPDATE jobs SET status = 'leased', worker_id = ?, lease_until = ?, attempt = attempt + 1, error_code = NULL, updated_at = ? WHERE id = ?").run(workerId,leaseUntil,now,job.id);
  db.exec('COMMIT'); return {...job, status:'leased', attempt:job.attempt+1, worker_id:workerId, lease_until:leaseUntil};
 } catch (error) { db.exec('ROLLBACK'); throw error; }
}
export function finish(db, {id, workerId, attempt, now, result}) {
 instant(now);
 const change = db.prepare("UPDATE jobs SET status='succeeded', result=?, updated_at=?, lease_until=NULL, worker_id=NULL WHERE id=? AND status='leased' AND worker_id=? AND attempt=? AND lease_until > ?").run(json(result),now,id,workerId,attempt,now);
 return change.changes === 1;
}
// Only the current unexpired lease may schedule a retry or terminal failure.
export function fail(db, {id, workerId, attempt, now, retryable, retryDelayMs = 0, errorCode}) {
 instant(now);
 if (typeof retryable !== 'boolean' || !Number.isSafeInteger(retryDelayMs) || retryDelayMs < 0 || retryDelayMs > 86400000 || !/^[a-z][a-z0-9_]{0,63}$/.test(errorCode || '')) throw new Error('Invalid failure');
 const availableAt = new Date(Date.parse(now) + retryDelayMs).toISOString();
 const change = db.prepare("UPDATE jobs SET status=CASE WHEN ? AND attempt < max_attempts THEN 'queued' ELSE 'failed' END, available_at=?, error_code=?, updated_at=?, lease_until=NULL, worker_id=NULL WHERE id=? AND status='leased' AND worker_id=? AND attempt=? AND lease_until > ?").run(retryable ? 1 : 0,availableAt,errorCode,now,id,workerId,attempt,now);
 return change.changes === 1;
}
// Authorization belongs to the calling use case; this is a storage operation only.
export function cancel(db, id, now) {
 instant(now);
 return db.prepare("UPDATE jobs SET status='cancelled', updated_at=?, lease_until=NULL, worker_id=NULL WHERE id=? AND status IN ('queued','leased')").run(now,id).changes === 1;
}

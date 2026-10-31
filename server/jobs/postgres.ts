import { randomUUID } from 'node:crypto';
import { withTransaction } from '../db/postgres.ts';

export interface JobRecord {
  id: string;
  kind: string;
  payload: string;
  status: 'queued' | 'leased' | 'succeeded' | 'failed' | 'cancelled';
  idempotency_key: string;
  attempt: number;
  max_attempts: number;
  lease_until: string | null;
  worker_id: string | null;
  result: string | null;
  created_at: string;
  updated_at: string;
  available_at: string;
  error_code: string | null;
}

function instant(value: unknown): string {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) {
    throw new Error('Invalid timestamp');
  }
  return value;
}

function boundedString(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= max;
}

function json(value: unknown): string {
  const encoded = JSON.stringify(value);
  if (typeof encoded !== 'string' || Buffer.byteLength(encoded) > 65536) throw new Error('Invalid job data');
  return encoded;
}

export async function enqueue(
  poolOrClient: any,
  {
    kind,
    payload,
    idempotencyKey,
    maxAttempts = 3,
    now = new Date().toISOString(),
  }: { kind: string; payload: unknown; idempotencyKey: string; maxAttempts?: number; now?: string }
): Promise<string> {
  instant(now);
  if (!boundedString(kind, 100) || !boundedString(idempotencyKey, 200) || !Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 10) {
    throw new Error('Invalid job');
  }
  const encoded = json(payload),
    id = randomUUID();

  return withTransaction(poolOrClient, async (client) => {
    await client.query(
      `INSERT INTO jobs (id, kind, payload, status, idempotency_key, max_attempts, created_at, updated_at, available_at)
       VALUES ($1, $2, $3, 'queued', $4, $5, $6, $7, $8)
       ON CONFLICT (idempotency_key) DO NOTHING`,
      [id, kind, encoded, idempotencyKey, maxAttempts, now, now, now]
    );

    const { rows } = await client.query('SELECT id, kind, payload, max_attempts FROM jobs WHERE idempotency_key = $1', [
      idempotencyKey,
    ]);
    const job = rows[0];
    if (job.kind !== kind || job.payload !== encoded || job.max_attempts !== maxAttempts) {
      throw new Error('Idempotency key conflict');
    }
    return job.id;
  });
}

export async function claim(poolOrClient: any, workerId: string, now: string, leaseMs = 30000): Promise<JobRecord | null> {
  instant(now);
  if (!boundedString(workerId, 200) || !Number.isSafeInteger(leaseMs) || leaseMs < 1 || leaseMs > 3600000) {
    throw new Error('Invalid lease');
  }
  const leaseUntil = new Date(Date.parse(now) + leaseMs).toISOString();

  return withTransaction(poolOrClient, async (client) => {
    await client.query(
      `UPDATE jobs SET status = 'failed', worker_id = NULL, lease_until = NULL, error_code = 'lease_expired', updated_at = $1
       WHERE status = 'leased' AND lease_until <= $2 AND attempt >= max_attempts`,
      [now, now]
    );

    const { rows } = await client.query(
      `SELECT * FROM jobs
       WHERE ((status = 'queued' AND available_at <= $1) OR (status = 'leased' AND lease_until <= $2))
         AND attempt < max_attempts
       ORDER BY created_at, id
       LIMIT 1
       FOR UPDATE SKIP LOCKED`,
      [now, now]
    );

    const job = rows[0];
    if (!job) return null;

    const nextAttempt = job.attempt + 1;
    await client.query(
      `UPDATE jobs SET status = 'leased', worker_id = $1, lease_until = $2, attempt = $3, error_code = NULL, updated_at = $4
       WHERE id = $5`,
      [workerId, leaseUntil, nextAttempt, now, job.id]
    );

    return { ...job, status: 'leased', attempt: nextAttempt, worker_id: workerId, lease_until: leaseUntil };
  });
}

export async function finish(
  poolOrClient: any,
  { id, workerId, attempt, now, result }: { id: string; workerId: string; attempt: number; now: string; result: unknown }
): Promise<boolean> {
  instant(now);
  const { rowCount } = await poolOrClient.query(
    `UPDATE jobs SET status = 'succeeded', result = $1, updated_at = $2, lease_until = NULL, worker_id = NULL
     WHERE id = $3 AND status = 'leased' AND worker_id = $4 AND attempt = $5 AND lease_until > $6`,
    [json(result), now, id, workerId, attempt, now]
  );
  return (rowCount ?? 0) === 1;
}

export async function fail(
  poolOrClient: any,
  {
    id,
    workerId,
    attempt,
    now,
    retryable,
    retryDelayMs = 0,
    errorCode,
  }: { id: string; workerId: string; attempt: number; now: string; retryable: boolean; retryDelayMs?: number; errorCode?: string }
): Promise<boolean> {
  instant(now);
  if (
    typeof retryable !== 'boolean' ||
    !Number.isSafeInteger(retryDelayMs) ||
    retryDelayMs < 0 ||
    retryDelayMs > 86400000 ||
    !/^[a-z][a-z0-9_]{0,63}$/.test(errorCode || '')
  ) {
    throw new Error('Invalid failure');
  }
  const availableAt = new Date(Date.parse(now) + retryDelayMs).toISOString();

  const { rowCount } = await poolOrClient.query(
    `UPDATE jobs
     SET status = CASE WHEN $1::boolean AND attempt < max_attempts THEN 'queued' ELSE 'failed' END,
         available_at = $2,
         error_code = $3,
         updated_at = $4,
         lease_until = NULL,
         worker_id = NULL
     WHERE id = $5 AND status = 'leased' AND worker_id = $6 AND attempt = $7 AND lease_until > $8`,
    [retryable, availableAt, errorCode, now, id, workerId, attempt, now]
  );
  return (rowCount ?? 0) === 1;
}

export async function cancel(poolOrClient: any, id: string, now: string): Promise<boolean> {
  instant(now);
  const { rowCount } = await poolOrClient.query(
    `UPDATE jobs SET status = 'cancelled', updated_at = $1, lease_until = NULL, worker_id = NULL
     WHERE id = $2 AND status IN ('queued', 'leased')`,
    [now, id]
  );
  return (rowCount ?? 0) === 1;
}

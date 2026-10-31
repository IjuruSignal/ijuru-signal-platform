import { randomUUID } from 'node:crypto';
import { withTransaction } from '../../../server/db/postgres.ts';

export interface FieldCheckInput {
  actorId: string;
  areaId: string;
  observation: string;
  observedAt: string;
  traceId: string;
}

export interface FieldCheckRecord {
  id: string;
  area_id: string;
  author_id: string;
  observation: string;
  observed_at: string;
  status: 'pending' | 'reviewed';
  version: number;
  created_at: string;
  updated_at: string;
}

function isPool(obj: any): boolean {
  return typeof obj?.totalCount === 'number';
}

async function actor(client: any, actorId: string, areaId: string) {
  const { rows } = await client.query('SELECT role FROM users WHERE id = $1', [actorId]);
  const user = rows[0];
  if (!user) throw new Error('Forbidden');
  if (user.role !== 'admin') {
    const { rows: accessRows } = await client.query(
      'SELECT 1 FROM area_access WHERE user_id = $1 AND area_id = $2',
      [actorId, areaId]
    );
    if (accessRows.length === 0) throw new Error('Forbidden');
  }
  return user;
}

async function audit(client: any, actorId: string, action: string, id: string, traceId: string, time: string) {
  await client.query(
    'INSERT INTO audit_events (id, actor_id, action, object_id, outcome, trace_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
    [randomUUID(), actorId, action, id, 'success', traceId, time]
  );
}

export async function createFieldCheck(poolOrClient: any, input: FieldCheckInput): Promise<string> {
  if (
    typeof input.observation !== 'string' ||
    !input.observation.trim() ||
    input.observation.length > 4000 ||
    !Number.isFinite(Date.parse(input.observedAt)) ||
    !input.traceId
  ) {
    throw new Error('Invalid input');
  }
  const id = randomUUID(),
    now = new Date().toISOString();

  return withTransaction(poolOrClient, async (client) => {
    await actor(client, input.actorId, input.areaId);
    await client.query(
      `INSERT INTO field_checks (id, area_id, author_id, observation, observed_at, status, version, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        id,
        input.areaId,
        input.actorId,
        input.observation.trim(),
        new Date(input.observedAt).toISOString(),
        'pending',
        1,
        now,
        now,
      ]
    );
    await audit(client, input.actorId, 'field_check.create', id, input.traceId, now);
    return id;
  });
}

export async function getFieldCheck(poolOrClient: any, actorId: string, id: string): Promise<FieldCheckRecord | null> {
  const isPooled = isPool(poolOrClient);
  const client = isPooled ? await poolOrClient.connect() : poolOrClient;
  try {
    const { rows } = await client.query('SELECT * FROM field_checks WHERE id = $1', [id]);
    const row = rows[0];
    if (!row) return null;
    const user = await actor(client, actorId, row.area_id);
    if (user.role === 'user' && row.author_id !== actorId) throw new Error('Forbidden');
    return row;
  } finally {
    if (isPooled) client.release();
  }
}

export async function reviewFieldCheck(
  poolOrClient: any,
  { actorId, id, version, traceId }: { actorId: string; id: string; version: number; traceId: string }
): Promise<void> {
  if (!traceId || !Number.isInteger(version)) throw new Error('Invalid input');

  return withTransaction(poolOrClient, async (client) => {
    const row = await getFieldCheck(client, actorId, id);
    if (!row) throw new Error('Not found');
    const user = await actor(client, actorId, row.area_id);
    if (!['reviewer', 'admin'].includes(user.role)) throw new Error('Forbidden');
    const now = new Date().toISOString();

    const result = await client.query(
      `UPDATE field_checks
       SET status = 'reviewed', version = version + 1, updated_at = $1
       WHERE id = $2 AND version = $3 AND status = 'pending'`,
      [now, id, version]
    );
    if (result.rowCount !== 1) throw new Error('Conflict');
    await audit(client, actorId, 'field_check.review', id, traceId, now);
  });
}

export async function listFieldChecks(
  poolOrClient: any,
  { actorId, areaId, status, limit = 50 }: { actorId: string; areaId: string; status?: 'pending' | 'reviewed'; limit?: number }
): Promise<FieldCheckRecord[]> {
  const isPooled = isPool(poolOrClient);
  const client = isPooled ? await poolOrClient.connect() : poolOrClient;
  try {
    const user = await actor(client, actorId, areaId);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100 || (status !== undefined && !['pending', 'reviewed'].includes(status))) {
      throw new Error('Invalid input');
    }

    const { rows } = await client.query(
      `SELECT * FROM field_checks
       WHERE area_id = $1
         AND ($2::text IS NULL OR status = $2::text)
         AND ($3::text != 'user' OR author_id = $4::text)
       ORDER BY created_at DESC, id DESC
       LIMIT $5`,
      [areaId, status ?? null, user.role, actorId, limit]
    );
    return rows;
  } finally {
    if (isPooled) client.release();
  }
}

export async function updateFieldCheck(
  poolOrClient: any,
  {
    actorId,
    id,
    version,
    observation,
    observedAt,
    traceId,
  }: { actorId: string; id: string; version: number; observation: string; observedAt: string; traceId: string }
): Promise<void> {
  if (
    !Number.isInteger(version) ||
    version < 1 ||
    typeof observation !== 'string' ||
    !observation.trim() ||
    observation.length > 4000 ||
    !Number.isFinite(Date.parse(observedAt)) ||
    !traceId
  ) {
    throw new Error('Invalid input');
  }

  return withTransaction(poolOrClient, async (client) => {
    const row = await getFieldCheck(client, actorId, id);
    if (!row) throw new Error('Not found');
    if (row.author_id !== actorId) throw new Error('Forbidden');
    if (row.status !== 'pending') throw new Error('Conflict');
    const now = new Date().toISOString();

    const result = await client.query(
      `UPDATE field_checks
       SET observation = $1, observed_at = $2, version = version + 1, updated_at = $3
       WHERE id = $4 AND version = $5 AND status = 'pending'`,
      [observation.trim(), new Date(observedAt).toISOString(), now, id, version]
    );
    if (result.rowCount !== 1) throw new Error('Conflict');
    await audit(client, actorId, 'field_check.update', id, traceId, now);
  });
}

export async function deleteFieldCheck(
  poolOrClient: any,
  { actorId, id, version, traceId }: { actorId: string; id: string; version: number; traceId: string }
): Promise<void> {
  if (!Number.isInteger(version) || version < 1 || !traceId) throw new Error('Invalid input');

  return withTransaction(poolOrClient, async (client) => {
    const row = await getFieldCheck(client, actorId, id);
    if (!row) throw new Error('Not found');
    if (row.author_id !== actorId) throw new Error('Forbidden');
    if (row.status !== 'pending') throw new Error('Conflict');
    const now = new Date().toISOString();

    const result = await client.query(
      `DELETE FROM field_checks
       WHERE id = $1 AND version = $2 AND status = 'pending'`,
      [id, version]
    );
    if (result.rowCount !== 1) throw new Error('Conflict');
    await audit(client, actorId, 'field_check.delete', id, traceId, now);
  });
}

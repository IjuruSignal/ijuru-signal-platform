import { randomUUID } from 'node:crypto';
import { validateBoundary } from '../domain/boundary.ts';
import { withTransaction } from '../../../server/db/postgres.ts';

function isPool(obj: any): boolean {
  return typeof obj?.totalCount === 'number';
}

async function actor(client: any, id: string) {
  const { rows } = await client.query('SELECT id, role FROM users WHERE id = $1', [id]);
  const user = rows[0];
  if (!user) throw new Error('Forbidden');
  return user;
}

async function authorizeArea(client: any, user: any, areaId: string) {
  if (user.role !== 'admin') {
    const { rows } = await client.query('SELECT 1 FROM area_access WHERE user_id = $1 AND area_id = $2', [user.id, areaId]);
    if (rows.length === 0) throw new Error('Forbidden');
  }
  const { rows: areaRows } = await client.query('SELECT 1 FROM areas WHERE id = $1', [areaId]);
  if (areaRows.length === 0) throw new Error('Not found');
}

async function audit(client: any, actorId: string, action: string, id: string, traceId: string, now: string) {
  await client.query(
    'INSERT INTO audit_events (id, actor_id, action, object_id, outcome, trace_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
    [randomUUID(), actorId, action, id, 'success', traceId, now]
  );
}

export async function createArea(poolOrClient: any, { actorId, id, name, traceId }: { actorId: string; id: string; name: string; traceId: string }): Promise<void> {
  if (![id, name, traceId].every((x) => typeof x === 'string' && x.trim() === x && x.length > 0 && x.length <= 200)) {
    throw new Error('Invalid input');
  }

  return withTransaction(poolOrClient, async (client) => {
    const user = await actor(client, actorId);
    if (user.role !== 'admin') throw new Error('Forbidden');
    const now = new Date().toISOString();
    await client.query('INSERT INTO areas (id, name, created_at) VALUES ($1, $2, $3)', [id, name, now]);
    await audit(client, actorId, 'area.create', id, traceId, now);
  });
}

export async function addBoundary(
  poolOrClient: any,
  { actorId, areaId, boundary, traceId }: { actorId: string; areaId: string; boundary: any; traceId: string }
): Promise<void> {
  if (typeof traceId !== 'string' || !traceId || traceId.length > 200) throw new Error('Invalid input');
  const parsed = validateBoundary(boundary);
  const { geometry, ...provenance } = parsed;

  return withTransaction(poolOrClient, async (client) => {
    const user = await actor(client, actorId);
    if (user.role !== 'admin') throw new Error('Forbidden');
    const now = new Date().toISOString();
    await client.query(
      `INSERT INTO area_boundaries (area_id, version, geometry_json, provenance_json, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [areaId, parsed.version, JSON.stringify(geometry), JSON.stringify(provenance), now]
    );
    await audit(client, actorId, 'area.boundary_add', areaId, traceId, now);
  });
}

export async function selectArea(poolOrClient: any, { actorId, areaId }: { actorId: string; areaId: string }): Promise<void> {
  return withTransaction(poolOrClient, async (client) => {
    const user = await actor(client, actorId);
    await authorizeArea(client, user, areaId);
    const now = new Date().toISOString();
    await client.query(
      `INSERT INTO area_preferences (user_id, area_id, updated_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET area_id = EXCLUDED.area_id, updated_at = EXCLUDED.updated_at`,
      [actorId, areaId, now]
    );
  });
}

export async function selectedArea(poolOrClient: any, actorId: string): Promise<{ id: string; name: string } | null> {
  const isPooled = isPool(poolOrClient);
  const client = isPooled ? await poolOrClient.connect() : poolOrClient;
  try {
    const user = await actor(client, actorId);
    const { rows } = await client.query(
      `SELECT areas.id, areas.name
       FROM area_preferences
       JOIN areas ON areas.id = area_preferences.area_id
       WHERE area_preferences.user_id = $1`,
      [actorId]
    );
    const row = rows[0];
    if (!row) return null;

    if (user.role !== 'admin') {
      const { rows: accessRows } = await client.query(
        'SELECT 1 FROM area_access WHERE user_id = $1 AND area_id = $2',
        [actorId, row.id]
      );
      if (accessRows.length === 0) return null;
    }
    return { id: row.id, name: row.name };
  } finally {
    if (isPooled) client.release();
  }
}

export async function listAreas(poolOrClient: any, actorId: string): Promise<Array<{ id: string; name: string }>> {
  const isPooled = isPool(poolOrClient);
  const client = isPooled ? await poolOrClient.connect() : poolOrClient;
  try {
    const user = await actor(client, actorId);
    if (user.role === 'admin') {
      const { rows } = await client.query('SELECT id, name FROM areas ORDER BY name, id');
      return rows;
    } else {
      const { rows } = await client.query(
        `SELECT areas.id, areas.name
         FROM areas
         JOIN area_access ON area_access.area_id = areas.id
         WHERE area_access.user_id = $1
         ORDER BY areas.name, areas.id`,
        [actorId]
      );
      return rows;
    }
  } finally {
    if (isPooled) client.release();
  }
}

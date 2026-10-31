import pg from 'pg';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const { Pool } = pg;

const migrations = [
  '001_initial.sql',
  '002_jobs.sql',
  '003_job_retry.sql',
  '004_auth.sql',
  '005_evidence.sql',
  '006_area_boundaries.sql',
  '007_evidence_boundaries.sql',
  '008_area_access_audit.sql',
].map((name) => fileURLToPath(new URL(`./migrations/postgres/${name}`, import.meta.url)));

export function createPool(databaseUrl: string, options: { max?: number; idleTimeoutMillis?: number; connectionTimeoutMillis?: number } = {}): pg.Pool {
  if (!databaseUrl || typeof databaseUrl !== 'string') {
    throw new Error('A valid PostgreSQL database URL is required');
  }

  let ssl: any = false;
  try {
    const parsed = new URL(databaseUrl);
    const isLocal = ['localhost', '127.0.0.1'].includes(parsed.hostname);
    if (!isLocal) {
      ssl = { rejectUnauthorized: false };
    }
  } catch {}

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl,
    max: options.max || 10,
    idleTimeoutMillis: options.idleTimeoutMillis || 10000,
    connectionTimeoutMillis: options.connectionTimeoutMillis || 5000,
  });
  return pool;
}

export async function withTransaction<T>(clientOrPool: any, fn: (client: any) => Promise<T>): Promise<T> {
  const isPool = typeof clientOrPool.connect === 'function' && typeof clientOrPool.totalCount === 'number';
  const client = isPool ? await clientOrPool.connect() : clientOrPool;
  const isPooledClient = isPool;

  if (!isPooledClient && client._inTransaction) {
    return await fn(client);
  }

  try {
    client._inTransaction = true;
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    client._inTransaction = false;
    return result;
  } catch (err) {
    client._inTransaction = false;
    try {
      await client.query('ROLLBACK');
    } catch {
      // Ignore rollback failure if connection was lost
    }
    throw err;
  } finally {
    if (isPooledClient) {
      client.release();
    }
  }
}

export async function migrate(pool: pg.Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(
      'CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)'
    );

    for (const [index, migrationPath] of migrations.entries()) {
      const version = index + 1;
      const { rows } = await client.query('SELECT version FROM schema_migrations WHERE version = $1', [version]);
      if (rows.length > 0) continue;

      await client.query('BEGIN');
      try {
        const sql = readFileSync(migrationPath, 'utf8');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version, applied_at) VALUES ($1, $2)', [
          version,
          new Date().toISOString(),
        ]);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }
  } finally {
    client.release();
  }
}

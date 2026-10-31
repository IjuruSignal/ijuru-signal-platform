import { createHash } from 'node:crypto';
import { openDatabase, migrate as migrateSqlite } from '../server/db/sqlite.ts';
import { createPool, withTransaction, migrate as migratePostgres } from '../server/db/postgres.ts';
import { loadConfig } from '../server/config/index.ts';

const tablesInOrder = [
  { name: 'users', primaryKeys: ['id'] },
  { name: 'areas', primaryKeys: ['id'] },
  { name: 'credentials', primaryKeys: ['user_id'] },
  { name: 'sessions', primaryKeys: ['token_hash'] },
  { name: 'area_access', primaryKeys: ['user_id', 'area_id'] },
  { name: 'area_boundaries', primaryKeys: ['area_id', 'version'] },
  { name: 'area_preferences', primaryKeys: ['user_id'] },
  { name: 'field_checks', primaryKeys: ['id'] },
  { name: 'evidence_records', primaryKeys: ['id'] },
  { name: 'evidence_boundary_refs', primaryKeys: ['evidence_id'] },
  { name: 'jobs', primaryKeys: ['id'] },
  { name: 'audit_events', primaryKeys: ['id'] },
  { name: 'area_access_audit', primaryKeys: ['event_id'] },
];

function tableChecksum(rows: any[], primaryKeys: string[]) {
  const sorted = [...rows].sort((a, b) => {
    for (const key of primaryKeys) {
      if (a[key] < b[key]) return -1;
      if (a[key] > b[key]) return 1;
    }
    return 0;
  });
  const hash = createHash('sha256');
  for (const row of sorted) {
    hash.update(JSON.stringify(row));
  }
  return hash.digest('hex');
}

export async function transferData({
  from,
  to,
  sqliteDb,
  pgPool,
  cleanTarget = false,
}: {
  from: 'sqlite' | 'postgres';
  to: 'sqlite' | 'postgres';
  sqliteDb: any;
  pgPool: any;
  cleanTarget?: boolean;
}): Promise<Array<{ table: string; rows: number; checksum: string }>> {
  if (!['sqlite', 'postgres'].includes(from) || !['sqlite', 'postgres'].includes(to) || from === to) {
    throw new Error('Transfer requires differing source and target engines (sqlite <-> postgres)');
  }

  const readSqlite = (table: string) => sqliteDb.prepare(`SELECT * FROM ${table}`).all();
  const readPostgres = async (table: string) => {
    const { rows } = await pgPool.query(`SELECT * FROM ${table}`);
    return rows;
  };

  const sourceReader = from === 'sqlite' ? readSqlite : readPostgres;
  const targetReader = to === 'sqlite' ? readSqlite : readPostgres;

  if (to === 'sqlite') {
    sqliteDb.exec('BEGIN IMMEDIATE');
    try {
      if (cleanTarget) {
        for (const { name } of [...tablesInOrder].reverse()) {
          sqliteDb.prepare(`DELETE FROM ${name}`).run();
        }
      }
      for (const { name } of tablesInOrder) {
        const count = sqliteDb.prepare(`SELECT count(*) as count FROM ${name}`).get().count;
        if (count > 0) throw new Error(`Target table ${name} is not empty`);
      }

      for (const { name } of tablesInOrder) {
        const rows = await sourceReader(name);
        if (rows.length === 0) continue;
        const cols = Object.keys(rows[0]);
        const placeholders = cols.map(() => '?').join(', ');
        const stmt = sqliteDb.prepare(`INSERT INTO ${name} (${cols.join(', ')}) VALUES (${placeholders})`);
        for (const row of rows) {
          stmt.run(...cols.map((c) => row[c]));
        }
      }
      sqliteDb.exec('COMMIT');
    } catch (err) {
      sqliteDb.exec('ROLLBACK');
      throw err;
    }
  } else {
    await withTransaction(pgPool, async (client) => {
      if (cleanTarget) {
        for (const { name } of [...tablesInOrder].reverse()) {
          await client.query(`DELETE FROM ${name}`);
        }
      }
      for (const { name } of tablesInOrder) {
        const { rows } = await client.query(`SELECT count(*) as count FROM ${name}`);
        if (Number(rows[0].count) > 0) throw new Error(`Target table ${name} is not empty`);
      }

      for (const { name } of tablesInOrder) {
        const rows = await sourceReader(name);
        if (rows.length === 0) continue;
        const cols = Object.keys(rows[0]);
        const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
        const queryText = `INSERT INTO ${name} (${cols.join(', ')}) VALUES (${placeholders})`;
        for (const row of rows) {
          await client.query(queryText, cols.map((c) => row[c]));
        }
      }
    });
  }

  const report = [];
  for (const { name, primaryKeys } of tablesInOrder) {
    const srcRows = await sourceReader(name);
    const tgtRows = await targetReader(name);

    if (srcRows.length !== tgtRows.length) {
      throw new Error(`Row count mismatch on table ${name}: source=${srcRows.length}, target=${tgtRows.length}`);
    }
    const srcChecksum = tableChecksum(srcRows, primaryKeys);
    const tgtChecksum = tableChecksum(tgtRows, primaryKeys);
    if (srcChecksum !== tgtChecksum) {
      throw new Error(`Checksum mismatch on table ${name}`);
    }
    report.push({ table: name, rows: srcRows.length, checksum: srcChecksum.slice(0, 8) });
  }

  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const from = (args.includes('--from') ? args[args.indexOf('--from') + 1] : 'sqlite') as 'sqlite' | 'postgres';
  const to = (args.includes('--to') ? args[args.indexOf('--to') + 1] : 'postgres') as 'sqlite' | 'postgres';
  const cleanTarget = args.includes('--clean');

  const config = loadConfig(process.env);
  const sqlitePath = config.db.provider === 'sqlite' ? config.db.sqlitePath : './data/app.sqlite';
  const sqliteDb = openDatabase(sqlitePath);
  migrateSqlite(sqliteDb);

  const pgUrl = process.env.DATABASE_URL || 'postgresql://ijuru_user:ijuru_local_secret@127.0.0.1:55431/ijuru_test';
  const pgPool = createPool(pgUrl);
  await migratePostgres(pgPool);

  try {
    console.log(`Starting transfer from ${from} to ${to}...`);
    const report = await transferData({ from, to, sqliteDb, pgPool, cleanTarget });
    console.log('Transfer complete. Verified tables:');
    for (const r of report) {
      console.log(`  - ${r.table.padEnd(24)} rows: ${String(r.rows).padStart(4)}  checksum: ${r.checksum}`);
    }
  } finally {
    sqliteDb.close();
    await pgPool.end();
  }
}

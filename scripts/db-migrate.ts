import { loadConfig } from '../server/config/index.ts';
import { openDatabase, migrate as migrateSqlite } from '../server/db/sqlite.ts';
import { createPool, migrate as migratePostgres } from '../server/db/postgres.ts';

const config = loadConfig(process.env);

if (config.db.provider === 'sqlite') {
  const db = openDatabase(config.db.sqlitePath);
  try {
    migrateSqlite(db);
    console.log('✓ SQLite migrations applied successfully.');
  } finally {
    db.close();
  }
} else {
  const pool = createPool(config.db.databaseUrl);
  try {
    await migratePostgres(pool);
    console.log('✓ PostgreSQL migrations applied successfully.');
  } finally {
    await pool.end();
  }
}

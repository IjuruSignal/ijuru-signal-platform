import { loadConfig } from '../config/index.ts';
import { openDatabase, migrate as migrateSqlite } from './sqlite.ts';
import { createPool, migrate as migratePostgres } from './postgres.ts';

let sqliteDbInstance: any = null;
let postgresPoolInstance: any = null;

export function getDbConnection() {
  const config = loadConfig(process.env);

  if (config.db.provider === 'postgres') {
    if (!postgresPoolInstance) {
      postgresPoolInstance = createPool(config.db.databaseUrl);
      // Run migrations lazily or synchronously in background
      migratePostgres(postgresPoolInstance).catch((err) => {
        console.error('Postgres lazy migration warning:', err.message);
      });
    }
    return {
      provider: 'postgres' as const,
      db: postgresPoolInstance,
      config,
    };
  }

  if (!sqliteDbInstance) {
    sqliteDbInstance = openDatabase(config.db.sqlitePath);
    migrateSqlite(sqliteDbInstance);
  }

  return {
    provider: 'sqlite' as const,
    db: sqliteDbInstance,
    config,
  };
}

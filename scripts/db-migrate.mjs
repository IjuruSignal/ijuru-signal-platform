import { loadConfig } from '../server/config/index.mjs';
import { openDatabase, migrate } from '../server/db/sqlite.mjs';

const config = loadConfig(process.env);
if (config.db.provider !== 'sqlite') throw new Error('Only SQLite migration is implemented');
const db = openDatabase(config.db.sqlitePath);
try {
  migrate(db);
  console.log('SQLite migrations applied.');
} finally {
  db.close();
}

import { resolve } from 'node:path';
import { chmodSync, existsSync } from 'node:fs';
import { loadConfig } from '../server/config/index.mjs';
import { openDatabase } from '../server/db/sqlite.mjs';

const config = loadConfig(process.env);
const source = config.db.sqlitePath;
const destination = process.argv[2];
if (!destination) throw new Error('Provide a new backup destination');
if (!existsSync(source)) throw new Error('Source database does not exist');
if (existsSync(destination) || resolve(source) === resolve(destination)) throw new Error('Backup destination already exists');
const db = openDatabase(source);
try {
  db.prepare('VACUUM INTO ?').run(resolve(destination));
  chmodSync(resolve(destination), 0o600);
  console.log('SQLite backup created. Store it securely and test restore.');
} finally {
  db.close();
}

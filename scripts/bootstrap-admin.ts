import { existsSync, statSync } from 'node:fs';
import { loadConfig } from '../server/config/index.ts';
import { openDatabase } from '../server/db/sqlite.ts';
import { bootstrapAdmin } from '../server/auth/sqlite.ts';

// Read from a pipe or an inherited protected file descriptor, never an argument
// or environment variable. Do not silently echo an interactive password.
const config = loadConfig(process.env);
if (config.db.provider !== 'sqlite') throw new Error('Only SQLite is supported');
if (process.stdin.isTTY) throw new Error('Provide the password through a protected stdin pipe; interactive echo is disabled');
const login = process.argv[2];
if (!login || process.argv.length !== 3) throw new Error('Usage: pnpm admin:bootstrap LOGIN (password on stdin)');
const path = config.db.sqlitePath;
if (!existsSync(path) || !statSync(path).isFile()) throw new Error('Database does not exist; run migrations first');
const chunks: Buffer[] = [];
let size = 0;
for await (const chunk of process.stdin) {
  size += (chunk as Buffer).length;
  if (size > 1026) throw new Error('Password input too long');
  chunks.push(chunk as Buffer);
}
const password = Buffer.concat(chunks).toString('utf8').replace(/\r?\n$/, '');
if (/[\r\n]/.test(password)) throw new Error('Password must be a single line');
const db = openDatabase(path);
try {
  if (!db.prepare('SELECT 1 FROM schema_migrations WHERE version=4').get()) throw new Error('Run migrations first');
  bootstrapAdmin(db, { login, password });
  console.log('Administrator created.');
} finally {
  db.close();
}

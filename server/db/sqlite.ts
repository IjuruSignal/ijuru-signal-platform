import { DatabaseSync } from 'node:sqlite';
import { chmodSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const migrations = [
  '001_initial.sql',
  '002_jobs.sql',
  '003_job_retry.sql',
  '004_auth.sql',
  '005_evidence.sql',
  '006_area_boundaries.sql',
  '007_evidence_boundaries.sql',
  '008_area_access_audit.sql',
].map((name) => fileURLToPath(new URL(`./migrations/sqlite/${name}`, import.meta.url)));

export function openDatabase(path: string): DatabaseSync {
  if (!path || path === ':memory:') throw new Error('A durable SQLite path is required');
  const absolute = resolve(path);
  mkdirSync(dirname(absolute), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(absolute);
  chmodSync(absolute, 0o600);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
  return db;
}

export function migrate(db: any): void {
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)');
  for (const [index, migration] of migrations.entries()) {
    const version = index + 1;
    if (db.prepare('SELECT version FROM schema_migrations WHERE version = ?').get(version)) continue;
    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec(readFileSync(migration, 'utf8'));
      db.prepare('INSERT INTO schema_migrations VALUES (?, ?)').run(version, new Date().toISOString());
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }
}

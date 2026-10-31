import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase, migrate } from '../server/db/sqlite.mjs';

test('migration is repeatable and enforces foreign keys and role constraints', () => {
 const dir = mkdtempSync(join(tmpdir(), 'ijuru-db-')); const db = openDatabase(join(dir, 'db.sqlite'));
 try { migrate(db); migrate(db); assert.equal(db.prepare('SELECT count(*) AS n FROM schema_migrations').get().n, 8);
 assert.equal(db.prepare('PRAGMA foreign_keys').get().foreign_keys, 1);
 assert.equal(db.prepare('PRAGMA journal_mode').get().journal_mode, 'wal');
 assert.throws(() => db.prepare('INSERT INTO users VALUES (?, ?, ?)').run('u', 'owner', '2026-01-01'));
 assert.throws(() => db.prepare('INSERT INTO area_access VALUES (?, ?)').run('missing', 'missing'));
 } finally { db.close(); rmSync(dir, { recursive: true, force: true }); }
});

import { createFieldCheck, getFieldCheck, reviewFieldCheck, listFieldChecks, updateFieldCheck, deleteFieldCheck } from '../features/field-checks/repositories/sqlite.mjs';
test('field checks enforce area, ownership, review role and version conflicts', () => {
 const dir = mkdtempSync(join(tmpdir(), 'ijuru-check-')); const db = openDatabase(join(dir, 'db.sqlite'));
 try { migrate(db); const now = new Date().toISOString();
 db.prepare('INSERT INTO areas (id, name, created_at) VALUES (?, ?, ?)').run('a', 'Area', now);
 for (const [id, role] of [['author','user'], ['other','user'], ['reviewer','reviewer'], ['outsider','reviewer']]) db.prepare('INSERT INTO users VALUES (?, ?, ?)').run(id, role, now);
 for (const id of ['author','other','reviewer']) db.prepare('INSERT INTO area_access VALUES (?, ?)').run(id, 'a');
 const id = createFieldCheck(db, { actorId:'author', areaId:'a', observation:'Water observed', observedAt:now, traceId:'trace' });
 assert.throws(() => getFieldCheck(db, 'other', id), /Forbidden/);
 assert.throws(() => getFieldCheck(db, 'outsider', id), /Forbidden/);
 assert.throws(() => reviewFieldCheck(db, {actorId:'author', id, version:1, traceId:'trace'}), /Forbidden/);
 reviewFieldCheck(db, {actorId:'reviewer', id, version:1, traceId:'trace'});
 assert.equal(getFieldCheck(db, 'author', id).status, 'reviewed');
 assert.throws(() => reviewFieldCheck(db, {actorId:'reviewer', id, version:1, traceId:'trace'}), /Conflict/);
 assert.equal(db.prepare('SELECT count(*) AS n FROM audit_events').get().n, 2);
 } finally { db.close(); rmSync(dir, {recursive:true, force:true}); }
});
import { enqueue, claim, finish, fail, cancel } from '../server/jobs/sqlite.mjs';
test('jobs deduplicate and fence stale workers after lease recovery', () => {
 const dir = mkdtempSync(join(tmpdir(), 'ijuru-job-')); const db = openDatabase(join(dir, 'db.sqlite'));
 try { migrate(db); const id = enqueue(db,{kind:'brief',payload:{},idempotencyKey:'one',now:'2026-01-01T00:00:00.000Z'}); assert.equal(enqueue(db,{kind:'brief',payload:{},idempotencyKey:'one',now:'2026-01-01T00:00:00.000Z'}),id);
 const first = claim(db,'worker1','2026-01-01T00:00:00.000Z',1000); assert.equal(first.id,id);
 const second = claim(db,'worker2','2026-01-01T00:00:02.000Z',1000); assert.equal(second.attempt,2);
 assert.equal(finish(db,{id,workerId:'worker1',attempt:1,now:'2026-01-01T00:00:02.000Z',result:{}}),false);
 assert.equal(finish(db,{id,workerId:'worker2',attempt:2,now:'2026-01-01T00:00:02.500Z',result:{}}),true);
 } finally { db.close(); rmSync(dir,{recursive:true,force:true}); }
});
test('job retries are delayed, bounded and fenced by cancellation and lease', () => {
 const dir = mkdtempSync(join(tmpdir(), 'ijuru-retry-')); const db = openDatabase(join(dir, 'db.sqlite'));
 try {
  migrate(db);
  const t0 = '2026-01-01T00:00:00.000Z';
  const id = enqueue(db,{kind:'source',payload:{area:'a'},idempotencyKey:'key',maxAttempts:2,now:t0});
  assert.throws(()=>enqueue(db,{kind:'source',payload:{area:'b'},idempotencyKey:'key',maxAttempts:2,now:t0}),/conflict/);
  const first = claim(db,'one',t0,10000);
  assert.equal(fail(db,{id,workerId:'one',attempt:first.attempt,now:t0,retryable:true,retryDelayMs:5000,errorCode:'timeout'}),true);
  assert.equal(claim(db,'two','2026-01-01T00:00:04.000Z'),null);
  const second = claim(db,'two','2026-01-01T00:00:05.000Z',10000);
  assert.equal(second.attempt,2);
  assert.equal(fail(db,{id,workerId:'one',attempt:first.attempt,now:'2026-01-01T00:00:06.000Z',retryable:true,errorCode:'timeout'}),false);
  assert.equal(fail(db,{id,workerId:'two',attempt:2,now:'2026-01-01T00:00:06.000Z',retryable:true,errorCode:'timeout'}),true);
  assert.equal(db.prepare('SELECT status FROM jobs WHERE id=?').get(id).status,'failed');
  const other = enqueue(db,{kind:'source',payload:{},idempotencyKey:'other',now:t0});
  claim(db,'three',t0,10000);
  assert.equal(cancel(db,other,'2026-01-01T00:00:01.000Z'),true);
  assert.equal(finish(db,{id:other,workerId:'three',attempt:1,now:'2026-01-01T00:00:02.000Z',result:{}}),false);
  assert.equal(cancel(db,other,'2026-01-01T00:00:02.000Z'),false);
  assert.throws(()=>claim(db,'worker','2026-01-01'),/timestamp/);
 } finally { db.close(); rmSync(dir,{recursive:true,force:true}); }
});
test('two SQLite connections cannot claim the same live lease and exhausted leases fail', () => {
 const dir = mkdtempSync(join(tmpdir(), 'ijuru-race-')); const path = join(dir,'db.sqlite');
 const first = openDatabase(path); const second = openDatabase(path);
 try {
  migrate(first);
  const now = '2026-01-01T00:00:00.000Z';
  const id = enqueue(first,{kind:'source',payload:{},idempotencyKey:'race',maxAttempts:1,now});
  assert.equal(claim(first,'one',now,1000).id,id);
  assert.equal(claim(second,'two',now,1000),null);
  assert.equal(claim(second,'two','2026-01-01T00:00:01.000Z',1000),null);
  assert.equal(first.prepare('SELECT status, error_code FROM jobs WHERE id=?').get(id).status,'failed');
  assert.equal(finish(first,{id,workerId:'one',attempt:1,now:'2026-01-01T00:00:01.000Z',result:{}}),false);
 } finally { first.close(); second.close(); rmSync(dir,{recursive:true,force:true}); }
});
test('field check lists, edits and deletes respect ownership, review and versions', () => {
 const dir = mkdtempSync(join(tmpdir(),'ijuru-crud-')); const db = openDatabase(join(dir,'db.sqlite'));
 try {
  migrate(db); const now = new Date().toISOString();
  db.prepare('INSERT INTO areas (id,name,created_at) VALUES (?,?,?)').run('a','Area',now);
  for (const [id,role] of [['a1','user'],['a2','user'],['r','reviewer']]) { db.prepare('INSERT INTO users VALUES (?,?,?)').run(id,role,now); db.prepare('INSERT INTO area_access VALUES (?,?)').run(id,'a'); }
  const id = createFieldCheck(db,{actorId:'a1',areaId:'a',observation:'first',observedAt:now,traceId:'t'});
  assert.equal(listFieldChecks(db,{actorId:'a2',areaId:'a'}).length,0);
  assert.equal(listFieldChecks(db,{actorId:'r',areaId:'a',status:'pending'}).length,1);
  assert.throws(()=>updateFieldCheck(db,{actorId:'r',id,version:1,observation:'edited',observedAt:now,traceId:'t'}),/Forbidden/);
  updateFieldCheck(db,{actorId:'a1',id,version:1,observation:'edited',observedAt:now,traceId:'t'});
  assert.throws(()=>deleteFieldCheck(db,{actorId:'a1',id,version:1,traceId:'t'}),/Conflict/);
  reviewFieldCheck(db,{actorId:'r',id,version:2,traceId:'t'});
  assert.throws(()=>updateFieldCheck(db,{actorId:'a1',id,version:3,observation:'edited',observedAt:now,traceId:'t'}),/Conflict/);
  assert.throws(()=>deleteFieldCheck(db,{actorId:'a1',id,version:3,traceId:'t'}),/Conflict/);
  const second = createFieldCheck(db,{actorId:'a1',areaId:'a',observation:'temporary',observedAt:now,traceId:'t'});
  deleteFieldCheck(db,{actorId:'a1',id:second,version:1,traceId:'t'});
  assert.equal(getFieldCheck(db,'a1',second),null);
  assert.equal(db.prepare('SELECT count(*) AS n FROM audit_events').get().n,5);
 } finally { db.close(); rmSync(dir,{recursive:true,force:true}); }
});

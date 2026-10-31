import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase, migrate } from '../server/db/sqlite.mjs';
import { enqueue, cancel } from '../server/jobs/sqlite.mjs';
import { runOne } from '../server/jobs/worker.mjs';

test('worker persists results, fences cancellation and retries timeout without logging errors', async () => {
 const dir = mkdtempSync(join(tmpdir(),'ijuru-worker-')); const db = openDatabase(join(dir,'db.sqlite'));
 const now = '2026-01-01T00:00:00.000Z', clock = () => new Date(now);
 try {
  migrate(db);
  const id = enqueue(db,{kind:'source',payload:{value:2},idempotencyKey:'a',now});
  assert.equal((await runOne(db,{workerId:'w',clock,handlers:{source:async p => ({value:p.value})}})).status,'succeeded');
  assert.deepEqual(JSON.parse(db.prepare('SELECT result FROM jobs WHERE id=?').get(id).result),{value:2});
  const cancelled = enqueue(db,{kind:'source',payload:{},idempotencyKey:'b',now});
  assert.equal((await runOne(db,{workerId:'w',clock,handlers:{source:async () => { cancel(db,cancelled,now); return {}; }}})).status,'lost_lease');
  const timed = enqueue(db,{kind:'source',payload:{},idempotencyKey:'c',now});
  assert.equal((await runOne(db,{workerId:'w',clock,leaseMs:100,timeoutMs:5,handlers:{source:async () => new Promise(resolve => setTimeout(() => resolve({}),20))}})).status,'queued');
  assert.equal(db.prepare('SELECT error_code FROM jobs WHERE id=?').get(timed).error_code,'timeout');
  assert.equal((await runOne(db,{workerId:'w',clock,handlers:{}})).status,'idle');
 } finally { db.close(); rmSync(dir,{recursive:true,force:true}); }
});

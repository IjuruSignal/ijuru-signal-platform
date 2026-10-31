import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase, migrate as migrateSqlite } from '../server/db/sqlite.ts';
import { createPool, migrate as migratePostgres, withTransaction } from '../server/db/postgres.ts';
import * as authSqlite from '../server/auth/sqlite.ts';
import * as authPg from '../server/auth/postgres.ts';
import * as jobsSqlite from '../server/jobs/sqlite.ts';
import * as jobsPg from '../server/jobs/postgres.ts';
import * as locationsSqlite from '../features/locations/repositories/sqlite.ts';
import * as locationsPg from '../features/locations/repositories/postgres.ts';
import * as fieldChecksSqlite from '../features/field-checks/repositories/sqlite.ts';
import * as fieldChecksPg from '../features/field-checks/repositories/postgres.ts';
import * as evidenceSqlite from '../features/evidence/repositories/sqlite.ts';
import * as evidencePg from '../features/evidence/repositories/postgres.ts';
import { transferData } from '../scripts/db-transfer.ts';

const pgUrl = process.env.DATABASE_URL || 'postgresql://ijuru_user:ijuru_local_secret@127.0.0.1:55431/ijuru_test';

// Clean test postgres database tables
async function cleanPg(pool) {
  await withTransaction(pool, async (client) => {
    await client.query(`
      TRUNCATE TABLE area_access_audit, audit_events, evidence_boundary_refs, evidence_records,
                     field_checks, area_preferences, area_boundaries, area_access, sessions,
                     credentials, jobs, areas, users CASCADE;
    `);
  });
}

const engines = [
  {
    name: 'SQLite',
    async setup() {
      const dir = mkdtempSync(join(tmpdir(), 'ijuru-parity-sqlite-'));
      const dbPath = join(dir, 'test.sqlite');
      const db = openDatabase(dbPath);
      migrateSqlite(db);
      return {
        db,
        auth: authSqlite,
        jobs: jobsSqlite,
        locations: locationsSqlite,
        fieldChecks: fieldChecksSqlite,
        evidence: evidenceSqlite,
        async cleanup() {
          db.close();
          rmSync(dir, { recursive: true, force: true });
        },
      };
    },
  },
  {
    name: 'PostgreSQL 18',
    async setup() {
      const pool = createPool(pgUrl);
      await migratePostgres(pool);
      await cleanPg(pool);
      return {
        db: pool,
        auth: authPg,
        jobs: jobsPg,
        locations: locationsPg,
        fieldChecks: fieldChecksPg,
        evidence: evidencePg,
        async cleanup() {
          await cleanPg(pool);
          await pool.end();
        },
      };
    },
  },
];

for (const { name, setup } of engines) {
  test(`${name} parity: foreign keys, cascades and role constraints`, async () => {
    const ctx = await setup();
    try {
      const now = new Date('2026-01-01T00:00:00.000Z');
      // Admin bootstrap
      const adminId = await ctx.auth.bootstrapAdmin(ctx.db, {
        login: 'sysadmin',
        password: 'secure-admin-passphrase',
        now,
      });
      const adminSession = await ctx.auth.login(ctx.db, {
        login: 'sysadmin',
        password: 'secure-admin-passphrase',
        now,
      });

      // Role constraint
      await assert.rejects(
        async () => {
          await ctx.auth.provisionUser(ctx.db, {
            sessionToken: adminSession.token,
            login: 'superman',
            password: 'valid-user-passphrase',
            role: 'superadmin',
            traceId: 'tr-1',
            now,
          });
        },
        /Invalid input/
      );

      // Create area and boundary
      await ctx.locations.createArea(ctx.db, {
        actorId: adminId,
        id: 'kigali',
        name: 'Kigali',
        traceId: 'tr-2',
      });

      // Provision normal user
      const userId = await ctx.auth.provisionUser(ctx.db, {
        sessionToken: adminSession.token,
        login: 'practitioner',
        password: 'valid-user-passphrase',
        role: 'user',
        traceId: 'tr-3',
        now,
      });

      // Grant area access
      await ctx.auth.changeAreaAccess(ctx.db, {
        sessionToken: adminSession.token,
        userId,
        areaId: 'kigali',
        grant: true,
        traceId: 'tr-grant',
        now,
      });

      // Authenticate
      const session = await ctx.auth.login(ctx.db, {
        login: 'practitioner',
        password: 'valid-user-passphrase',
        now,
      });
      assert.ok(session.token);

      const authed = await ctx.auth.authenticate(ctx.db, session.token, now);
      assert.equal(authed.id, userId);
      assert.equal(authed.role, 'user');
    } finally {
      await ctx.cleanup();
    }
  });

  test(`${name} parity: field check optimistic locking and reviewer transitions`, async () => {
    const ctx = await setup();
    try {
      const now = new Date('2026-01-01T00:00:00.000Z');
      const adminId = await ctx.auth.bootstrapAdmin(ctx.db, {
        login: 'admin-lead',
        password: 'secure-admin-passphrase',
        now,
      });
      const adminSession = await ctx.auth.login(ctx.db, {
        login: 'admin-lead',
        password: 'secure-admin-passphrase',
        now,
      });

      await ctx.locations.createArea(ctx.db, {
        actorId: adminId,
        id: 'bugesera',
        name: 'Bugesera',
        traceId: 'tr-area',
      });

      const reviewerId = await ctx.auth.provisionUser(ctx.db, {
        sessionToken: adminSession.token,
        login: 'field-reviewer',
        password: 'reviewer-passphrase',
        role: 'reviewer',
        traceId: 'tr-rev',
        now,
      });
      await ctx.auth.changeAreaAccess(ctx.db, {
        sessionToken: adminSession.token,
        userId: reviewerId,
        areaId: 'bugesera',
        grant: true,
        traceId: 'tr-rev-grant',
        now,
      });

      const userId = await ctx.auth.provisionUser(ctx.db, {
        sessionToken: adminSession.token,
        login: 'farmer-joe',
        password: 'farmer-passphrase',
        role: 'user',
        traceId: 'tr-user',
        now,
      });
      await ctx.auth.changeAreaAccess(ctx.db, {
        sessionToken: adminSession.token,
        userId,
        areaId: 'bugesera',
        grant: true,
        traceId: 'tr-user-grant',
        now,
      });

      // Create field check
      const checkId = await ctx.fieldChecks.createFieldCheck(ctx.db, {
        actorId: userId,
        areaId: 'bugesera',
        observation: 'Water level rising in north canal',
        observedAt: now.toISOString(),
        traceId: 'tr-check-1',
      });

      const record = await ctx.fieldChecks.getFieldCheck(ctx.db, userId, checkId);
      assert.equal(record.version, 1);
      assert.equal(record.status, 'pending');

      // Successful review updates version to 2
      await ctx.fieldChecks.reviewFieldCheck(ctx.db, {
        actorId: reviewerId,
        id: checkId,
        version: 1,
        traceId: 'tr-review-1',
      });

      const updated = await ctx.fieldChecks.getFieldCheck(ctx.db, reviewerId, checkId);
      assert.equal(updated.version, 2);
      assert.equal(updated.status, 'reviewed');

      // Conflict: Stale version review must fail
      await assert.rejects(
        async () => {
          await ctx.fieldChecks.reviewFieldCheck(ctx.db, {
            actorId: reviewerId,
            id: checkId,
            version: 1,
            traceId: 'tr-review-stale',
          });
        },
        /Conflict/
      );

      // Conflict: Author cannot update reviewed check
      await assert.rejects(
        async () => {
          await ctx.fieldChecks.updateFieldCheck(ctx.db, {
            actorId: userId,
            id: checkId,
            version: 2,
            observation: 'Attempt late edit',
            observedAt: now.toISOString(),
            traceId: 'tr-edit-conflict',
          });
        },
        /Conflict/
      );
    } finally {
      await ctx.cleanup();
    }
  });

  test(`${name} parity: job queue deduplication, claims and worker lease recovery`, async () => {
    const ctx = await setup();
    try {
      const now = '2026-01-01T00:00:00.000Z';
      const jobId = await ctx.jobs.enqueue(ctx.db, {
        kind: 'ingest.satellite',
        payload: { tile: '35MRA' },
        idempotencyKey: 'idem-100',
        maxAttempts: 2,
        now,
      });
      assert.ok(jobId);

      // Idempotency deduplication
      const duplicateId = await ctx.jobs.enqueue(ctx.db, {
        kind: 'ingest.satellite',
        payload: { tile: '35MRA' },
        idempotencyKey: 'idem-100',
        maxAttempts: 2,
        now,
      });
      assert.equal(duplicateId, jobId);

      // Claim job with worker-A
      const claimed = await ctx.jobs.claim(ctx.db, 'worker-A', now, 10000);
      assert.equal(claimed.id, jobId);
      assert.equal(claimed.attempt, 1);
      assert.equal(claimed.worker_id, 'worker-A');

      // Simultaneous claim while lease is active returns null
      const secondClaim = await ctx.jobs.claim(ctx.db, 'worker-B', now, 10000);
      assert.equal(secondClaim, null);

      // Lease expires: 15 seconds later
      const later = '2026-01-01T00:00:15.000Z';
      const recovered = await ctx.jobs.claim(ctx.db, 'worker-B', later, 10000);
      assert.equal(recovered.id, jobId);
      assert.equal(recovered.attempt, 2);
      assert.equal(recovered.worker_id, 'worker-B');

      // Late update from worker-A is fenced out
      const staleFinish = await ctx.jobs.finish(ctx.db, {
        id: jobId,
        workerId: 'worker-A',
        attempt: 1,
        now: later,
        result: { status: 'done' },
      });
      assert.equal(staleFinish, false);

      // Valid finish from worker-B succeeds
      const validFinish = await ctx.jobs.finish(ctx.db, {
        id: jobId,
        workerId: 'worker-B',
        attempt: 2,
        now: later,
        result: { status: 'success' },
      });
      assert.equal(validFinish, true);
    } finally {
      await ctx.cleanup();
    }
  });
}

test('Offline data transfer: SQLite <-> PostgreSQL checksum and row count parity', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ijuru-transfer-test-'));
  const sqliteDb = openDatabase(join(dir, 'source.sqlite'));
  migrateSqlite(sqliteDb);

  const pgPool = createPool(pgUrl);
  await migratePostgres(pgPool);
  await cleanPg(pgPool);

  try {
    const now = new Date('2026-01-01T00:00:00.000Z');
    // Populate SQLite with sample data across multiple tables
    const adminId = authSqlite.bootstrapAdmin(sqliteDb, {
      login: 'transfer-admin',
      password: 'transfer-passphrase',
      now,
    });
    const adminSession = authSqlite.login(sqliteDb, {
      login: 'transfer-admin',
      password: 'transfer-passphrase',
      now,
    });

    locationsSqlite.createArea(sqliteDb, {
      actorId: adminId,
      id: 'musanze',
      name: 'Musanze',
      traceId: 'tr-musanze',
    });

    locationsSqlite.addBoundary(sqliteDb, {
      actorId: adminId,
      areaId: 'musanze',
      traceId: 'tr-bnd',
      boundary: {
        version: 'v1',
        fixture: true,
        sourceName: 'NISR Boundary Service',
        sourceUrl: 'https://example.gov.rw/boundaries',
        license: 'CC-BY-4.0',
        acquiredAt: now.toISOString(),
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [29.5, -1.4],
              [29.7, -1.4],
              [29.7, -1.6],
              [29.5, -1.6],
              [29.5, -1.4],
            ],
          ],
        },
      },
    });

    const reviewerId = authSqlite.provisionUser(sqliteDb, {
      sessionToken: adminSession.token,
      login: 'musanze-reviewer',
      password: 'reviewer-passphrase',
      role: 'reviewer',
      traceId: 'tr-prov',
      now,
    });
    authSqlite.changeAreaAccess(sqliteDb, {
      sessionToken: adminSession.token,
      userId: reviewerId,
      areaId: 'musanze',
      grant: true,
      traceId: 'tr-grant',
      now,
    });

    fieldChecksSqlite.createFieldCheck(sqliteDb, {
      actorId: reviewerId,
      areaId: 'musanze',
      observation: 'Volcanic runoff clear, no blockage',
      observedAt: now.toISOString(),
      traceId: 'tr-fc',
    });

    jobsSqlite.enqueue(sqliteDb, {
      kind: 'test.job',
      payload: { hello: 'world' },
      idempotencyKey: 'job-transfer-1',
      maxAttempts: 3,
      now: now.toISOString(),
    });

    // Transfer SQLite -> PostgreSQL
    const forwardReport = await transferData({
      from: 'sqlite',
      to: 'postgres',
      sqliteDb,
      pgPool,
      cleanTarget: true,
    });
    assert.ok(forwardReport.length > 0);

    // Verify PostgreSQL contents directly
    const { rows: userRows } = await pgPool.query('SELECT * FROM users');
    assert.equal(userRows.length, 2);

    const { rows: areaRows } = await pgPool.query('SELECT * FROM areas');
    assert.equal(areaRows.length, 1);
    assert.equal(areaRows[0].id, 'musanze');

    const { rows: checkRows } = await pgPool.query('SELECT * FROM field_checks');
    assert.equal(checkRows.length, 1);
    assert.equal(checkRows[0].area_id, 'musanze');

    // Transfer PostgreSQL -> clean SQLite
    const roundtripDir = mkdtempSync(join(tmpdir(), 'ijuru-transfer-rt-'));
    const roundtripSqlite = openDatabase(join(roundtripDir, 'roundtrip.sqlite'));
    migrateSqlite(roundtripSqlite);

    const reverseReport = await transferData({
      from: 'postgres',
      to: 'sqlite',
      sqliteDb: roundtripSqlite,
      pgPool,
      cleanTarget: true,
    });
    assert.ok(reverseReport.length > 0);

    // Verify roundtrip SQLite
    const rtUsers = roundtripSqlite.prepare('SELECT count(*) as count FROM users').get().count;
    assert.equal(rtUsers, 2);

    const rtChecks = roundtripSqlite.prepare('SELECT observation FROM field_checks').get();
    assert.equal(rtChecks.observation, 'Volcanic runoff clear, no blockage');

    roundtripSqlite.close();
    rmSync(roundtripDir, { recursive: true, force: true });
  } finally {
    sqliteDb.close();
    rmSync(dir, { recursive: true, force: true });
    await cleanPg(pgPool);
    await pgPool.end();
  }
});

import { openDatabase, migrate as migrateSqlite } from '../server/db/sqlite.ts';
import { createPool, migrate as migratePostgres, withTransaction } from '../server/db/postgres.ts';
import { setCredential } from '../server/auth/sqlite.ts';
import { setCredential as setCredentialPg } from '../server/auth/postgres.ts';
import { loadConfig, type AppConfig } from '../server/config/index.ts';

export const DISTRICTS = [
  { id: 'kigali', name: 'Kigali', coordinates: [[[30.0, -1.9], [30.15, -1.9], [30.15, -2.05], [30.0, -2.05], [30.0, -1.9]]] },
  { id: 'bugesera', name: 'Bugesera', coordinates: [[[30.05, -2.1], [30.3, -2.1], [30.3, -2.4], [30.05, -2.4], [30.05, -2.1]]] },
  { id: 'musanze', name: 'Musanze', coordinates: [[[29.55, -1.45], [29.75, -1.45], [29.75, -1.65], [29.55, -1.65], [29.55, -1.45]]] },
  { id: 'rubavu', name: 'Rubavu', coordinates: [[[29.22, -1.62], [29.35, -1.62], [29.35, -1.78], [29.22, -1.78], [29.22, -1.62]]] },
  { id: 'nyagatare', name: 'Nyagatare', coordinates: [[[30.2, -1.2], [30.5, -1.2], [30.5, -1.5], [30.2, -1.5], [30.2, -1.2]]] },
];

export const DEMO_USERS = [
  { id: 'user-admin-01', login: 'admin@ijuru.rw', role: 'admin' as const },
  { id: 'user-reviewer-01', login: 'reviewer@ijuru.rw', role: 'reviewer' as const },
  { id: 'user-field-01', login: 'field@ijuru.rw', role: 'user' as const },
];
export const DEMO_PASSWORD = 'demo12345678';

export const SAMPLE_CHECKS = [
  {
    id: 'fc-01',
    areaId: 'musanze',
    authorId: 'user-field-01',
    observation: 'Volcanic drainage ravine cleared in Muhoza sector; soil moisture high after heavy rainfall on slopes.',
    status: 'reviewed' as const,
    version: 2,
    observedAt: '2026-10-30T09:30:00.000Z',
  },
  {
    id: 'fc-02',
    areaId: 'bugesera',
    authorId: 'user-field-01',
    observation: 'Dry spell observed in Nyamata sector maize plots; early moisture deficit symptoms on shallow soils.',
    status: 'pending' as const,
    version: 1,
    observedAt: '2026-10-30T14:15:00.000Z',
  },
  {
    id: 'fc-03',
    areaId: 'rubavu',
    authorId: 'user-field-01',
    observation: 'Sebeya river diversion canal checked at Gisenyi bridge; flow velocity normal, riverbanks stable.',
    status: 'reviewed' as const,
    version: 2,
    observedAt: '2026-10-29T11:00:00.000Z',
  },
  {
    id: 'fc-04',
    areaId: 'kigali',
    authorId: 'user-field-01',
    observation: 'Nyabugogo storm drain inspection shows minor silt buildup near commercial strip. Culvert intake clear.',
    status: 'pending' as const,
    version: 1,
    observedAt: '2026-10-31T08:00:00.000Z',
  },
  {
    id: 'fc-05',
    areaId: 'nyagatare',
    authorId: 'user-field-01',
    observation: 'Rukomo valley dams at 65% capacity; cattle grazing conditions stable across eastern pasture.',
    status: 'pending' as const,
    version: 1,
    observedAt: '2026-10-31T10:45:00.000Z',
  },
];

export async function seedDatabase({ config }: { config: AppConfig }): Promise<void> {
  const now = new Date().toISOString();

  if (config.db.provider === 'postgres') {
    const pool = createPool(config.db.databaseUrl);
    await migratePostgres(pool);

    await withTransaction(pool, async (client) => {
      for (const d of DISTRICTS) {
        await client.query(
          `INSERT INTO areas (id, name, created_at)
           VALUES ($1, $2, $3)
           ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
          [d.id, d.name, now]
        );

        const boundaryVersion = 'v1';
        const geomJson = JSON.stringify({ type: 'Polygon', coordinates: d.coordinates });
        const provJson = JSON.stringify({
          version: boundaryVersion,
          fixture: true,
          sourceName: 'National Institute of Statistics of Rwanda (NISR)',
          sourceUrl: 'https://statistics.gov.rw/geodata',
          license: 'CC-BY-4.0',
          acquiredAt: now,
        });

        await client.query(
          `INSERT INTO area_boundaries (area_id, version, geometry_json, provenance_json, created_at)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (area_id, version) DO UPDATE SET geometry_json = EXCLUDED.geometry_json`,
          [d.id, boundaryVersion, geomJson, provJson, now]
        );
      }

      for (const u of DEMO_USERS) {
        await client.query(
          `INSERT INTO users (id, role, created_at)
           VALUES ($1, $2, $3)
           ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role`,
          [u.id, u.role, now]
        );
        await setCredentialPg(client, { userId: u.id, login: u.login, password: DEMO_PASSWORD });

        for (const d of DISTRICTS) {
          await client.query(
            `INSERT INTO area_access (user_id, area_id)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [u.id, d.id]
          );
        }
      }

      for (const fc of SAMPLE_CHECKS) {
        await client.query(
          `INSERT INTO field_checks (id, area_id, author_id, observation, observed_at, status, version, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (id) DO UPDATE SET
             observation = EXCLUDED.observation,
             status = EXCLUDED.status,
             version = EXCLUDED.version`,
          [fc.id, fc.areaId, fc.authorId, fc.observation, fc.observedAt, fc.status, fc.version, now, now]
        );
      }
    });

    await pool.end();
  } else {
    // SQLite
    const db = openDatabase(config.db.sqlitePath);
    migrateSqlite(db);

    try {
      for (const d of DISTRICTS) {
        db.prepare(
          `INSERT INTO areas (id, name, created_at)
           VALUES (?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET name = excluded.name`
        ).run(d.id, d.name, now);

        const boundaryVersion = 'v1';
        const geomJson = JSON.stringify({ type: 'Polygon', coordinates: d.coordinates });
        const provJson = JSON.stringify({
          version: boundaryVersion,
          fixture: true,
          sourceName: 'National Institute of Statistics of Rwanda (NISR)',
          sourceUrl: 'https://statistics.gov.rw/geodata',
          license: 'CC-BY-4.0',
          acquiredAt: now,
        });

        db.prepare(
          `INSERT INTO area_boundaries (area_id, version, geometry_json, provenance_json, created_at)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(area_id, version) DO UPDATE SET geometry_json = excluded.geometry_json`
        ).run(d.id, boundaryVersion, geomJson, provJson, now);
      }

      for (const u of DEMO_USERS) {
        db.prepare(
          `INSERT INTO users (id, role, created_at)
           VALUES (?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET role = excluded.role`
        ).run(u.id, u.role, now);

        setCredential(db, { userId: u.id, login: u.login, password: DEMO_PASSWORD });

        for (const d of DISTRICTS) {
          db.prepare('INSERT OR IGNORE INTO area_access (user_id, area_id) VALUES (?, ?)').run(u.id, d.id);
        }
      }

      for (const fc of SAMPLE_CHECKS) {
        db.prepare(
          `INSERT INTO field_checks (id, area_id, author_id, observation, observed_at, status, version, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             observation = excluded.observation,
             status = excluded.status,
             version = excluded.version`
        ).run(fc.id, fc.areaId, fc.authorId, fc.observation, fc.observedAt, fc.status, fc.version, now, now);
      }
    } finally {
      db.close();
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const config = loadConfig(process.env);
  const target = config.db.provider === 'sqlite' ? config.db.sqlitePath : config.db.databaseUrl;
  console.log(`Seeding ${config.db.provider} database (${target})...`);
  await seedDatabase({ config });
  console.log('✓ Seeding complete:');
  console.log('  - 5 Districts & Boundaries (Kigali, Bugesera, Musanze, Rubavu, Nyagatare)');
  console.log('  - 3 Demo Users: admin@ijuru.rw, reviewer@ijuru.rw, field@ijuru.rw (Password: demo12345678)');
  console.log('  - 5 Realistic Field Checks (reviewed & pending)');
}

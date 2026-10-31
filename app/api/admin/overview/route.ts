import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getDbConnection } from '@/server/db/connection.ts';
import { getCurrentUser, registerUser } from '@/server/auth/session.ts';

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    const { provider, db, config } = getDbConnection();

    let users: any[] = [];
    let checks: any[] = [];
    let audits: any[] = [];
    let migrationsCount = 8;

    if (provider === 'postgres') {
      const usersRes = await db.query(
        `SELECT u.id, u.role, u.created_at, c.login,
                (SELECT count(*) FROM area_access aa WHERE aa.user_id = u.id) AS area_count
         FROM users u
         LEFT JOIN credentials c ON c.user_id = u.id
         ORDER BY u.created_at DESC`
      );
      users = usersRes.rows;

      const checksRes = await db.query(
        `SELECT fc.*, a.name AS area_name
         FROM field_checks fc
         LEFT JOIN areas a ON a.id = fc.area_id
         ORDER BY fc.created_at DESC
         LIMIT 100`
      );
      checks = checksRes.rows;

      const auditsRes = await db.query(
        `SELECT id, actor_id, action, target_id, outcome, created_at
         FROM audit_events
         ORDER BY created_at DESC
         LIMIT 30`
      );
      audits = auditsRes.rows;

      const migRes = await db.query(`SELECT count(*) AS n FROM schema_migrations`);
      migrationsCount = Number(migRes.rows[0]?.n || 8);
    } else {
      users = db
        .prepare(
          `SELECT u.id, u.role, u.created_at, c.login,
                  (SELECT count(*) FROM area_access aa WHERE aa.user_id = u.id) AS area_count
           FROM users u
           LEFT JOIN credentials c ON c.user_id = u.id
           ORDER BY u.created_at DESC`
        )
        .all();

      checks = db
        .prepare(
          `SELECT fc.*, a.name AS area_name
           FROM field_checks fc
           LEFT JOIN areas a ON a.id = fc.area_id
           ORDER BY fc.created_at DESC
           LIMIT 100`
        )
        .all();

      audits = db
        .prepare(
          `SELECT id, actor_id, action, target_id, outcome, created_at
           FROM audit_events
           ORDER BY created_at DESC
           LIMIT 30`
        )
        .all();

      const migRow = db.prepare(`SELECT count(*) AS n FROM schema_migrations`).get() as any;
      migrationsCount = Number(migRow?.n || 8);
    }

    const aiEnabled = config.ai.provider !== 'disabled';
    const aiModel = config.ai.provider !== 'disabled' ? config.ai.model : 'offline-deterministic-synthesis';

    return NextResponse.json({
      currentUser,
      users,
      checks,
      audits,
      system: {
        dbProvider: provider,
        migrationsCount,
        aiProvider: config.ai.provider,
        aiModel,
        aiEnabled,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to load admin overview' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await getCurrentUser();
    const { provider, db } = getDbConnection();
    const body = await req.json().catch(() => ({}));
    const { action } = body;

    if (action === 'create_user') {
      const { email, password, role } = body;
      const created = await registerUser({
        email,
        password: password || 'demo12345678',
        role: ['user', 'reviewer', 'admin'].includes(role) ? role : 'user',
      });
      return NextResponse.json({ ok: true, user: created.user });
    }

    if (action === 'update_role') {
      const { userId, role } = body;
      if (!userId || !['user', 'reviewer', 'admin'].includes(role)) {
        return NextResponse.json({ error: 'Invalid user ID or role' }, { status: 400 });
      }
      const now = new Date().toISOString();
      if (provider === 'postgres') {
        await db.query('UPDATE users SET role = $1 WHERE id = $2', [role, userId]);
        await db.query(
          'INSERT INTO audit_events VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [randomUUID(), actor.id, 'user.role_update', userId, 'success', randomUUID(), now]
        );
      } else {
        db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, userId);
        db.prepare(
          'INSERT INTO audit_events VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).run(randomUUID(), actor.id, 'user.role_update', userId, 'success', randomUUID(), now);
      }
      return NextResponse.json({ ok: true, userId, role });
    }

    return NextResponse.json({ error: 'Unknown admin action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Admin operation failed' },
      { status: 400 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getDbConnection } from '@/server/db/connection.ts';
import { getCurrentUser, ensureDemoUserAndArea } from '@/server/auth/session.ts';
import {
  listFieldChecks as listSqlite,
  createFieldCheck as createSqlite,
} from '@/features/field-checks/repositories/sqlite.ts';
import {
  listFieldChecks as listPg,
  createFieldCheck as createPg,
} from '@/features/field-checks/repositories/postgres.ts';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { provider, db } = getDbConnection();
    const { searchParams } = new URL(req.url);
    const areaId = searchParams.get('areaId') || 'all';
    const status =
      (searchParams.get('status') as 'pending' | 'reviewed' | null) || undefined;

    if (areaId === 'all') {
      let checks: any[] = [];
      if (provider === 'postgres') {
        const { rows } = await db.query(
          `SELECT fc.*, a.name AS area_name
           FROM field_checks fc
           LEFT JOIN areas a ON a.id = fc.area_id
           WHERE ($1::text IS NULL OR fc.status = $1::text)
           ORDER BY fc.created_at DESC, fc.id DESC
           LIMIT 100`,
          [status ?? null]
        );
        checks = rows;
      } else {
        checks = db
          .prepare(
            `SELECT fc.*, a.name AS area_name
             FROM field_checks fc
             LEFT JOIN areas a ON a.id = fc.area_id
             WHERE (? IS NULL OR fc.status = ?)
             ORDER BY fc.created_at DESC, fc.id DESC
             LIMIT 100`
          )
          .all(status ?? null, status ?? null);
      }
      return NextResponse.json({ checks });
    }

    await ensureDemoUserAndArea(user, areaId);

    let checks: any[] = [];
    if (provider === 'postgres') {
      checks = await listPg(db, { actorId: user.id, areaId, status, limit: 50 });
    } else {
      checks = listSqlite(db, { actorId: user.id, areaId, status, limit: 50 });
    }

    return NextResponse.json({ checks });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to list field checks' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { provider, db } = getDbConnection();
    const body = await req.json();
    const { areaId, areaName, observation, observedAt } = body;

    if (!areaId || !observation || !observation.trim()) {
      return NextResponse.json(
        { error: 'Observation note and location are required.' },
        { status: 400 }
      );
    }

    await ensureDemoUserAndArea(user, areaId, areaName);

    const traceId = randomUUID();
    const obsDate = observedAt || new Date().toISOString();

    let id: string;
    if (provider === 'postgres') {
      id = await createPg(db, {
        actorId: user.id,
        areaId,
        observation: observation.trim(),
        observedAt: obsDate,
        traceId,
      });
    } else {
      id = createSqlite(db, {
        actorId: user.id,
        areaId,
        observation: observation.trim(),
        observedAt: obsDate,
        traceId,
      });
    }

    return NextResponse.json({
      ok: true,
      id,
      fieldCheck: {
        id,
        area_id: areaId,
        area_name: areaName || areaId,
        author_id: user.id,
        observation: observation.trim(),
        observed_at: obsDate,
        status: 'pending',
        version: 1,
        created_at: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to record field check' },
      { status: 500 }
    );
  }
}

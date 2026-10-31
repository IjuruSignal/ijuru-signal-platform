import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getDbConnection } from '@/server/db/connection.ts';
import { getCurrentUser } from '@/server/auth/session.ts';
import { listFieldChecks as listSqlite, createFieldCheck as createSqlite } from '@/features/field-checks/repositories/sqlite.ts';
import { listFieldChecks as listPg, createFieldCheck as createPg } from '@/features/field-checks/repositories/postgres.ts';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { provider, db } = getDbConnection();
    const { searchParams } = new URL(req.url);
    const areaId = searchParams.get('areaId') || 'kigali';
    const status = (searchParams.get('status') as 'pending' | 'reviewed' | null) || undefined;

    let checks: any[] = [];
    if (provider === 'postgres') {
      checks = await listPg(db, { actorId: user.id, areaId, status, limit: 50 });
    } else {
      checks = listSqlite(db, { actorId: user.id, areaId, status, limit: 50 });
    }

    return NextResponse.json({ checks });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to list field checks' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { provider, db } = getDbConnection();
    const body = await req.json();
    const { areaId, observation, observedAt } = body;

    if (!areaId || !observation || !observation.trim()) {
      return NextResponse.json({ error: 'Observation note and areaId are required' }, { status: 400 });
    }

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
        author_id: user.id,
        observation: observation.trim(),
        observed_at: obsDate,
        status: 'pending',
        version: 1,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to record field check' }, { status: 500 });
  }
}

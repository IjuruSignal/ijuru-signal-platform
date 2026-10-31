import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getDbConnection } from '@/server/db/connection.ts';
import { getCurrentUser } from '@/server/auth/session.ts';
import { reviewFieldCheck as reviewSqlite } from '@/features/field-checks/repositories/sqlite.ts';
import { reviewFieldCheck as reviewPg } from '@/features/field-checks/repositories/postgres.ts';

export async function PATCH(
  req: NextRequest,
  segmentData: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await segmentData.params;
    const user = await getCurrentUser();
    const body = await req.json().catch(() => ({}));
    const version = Number.isInteger(body.version) ? body.version : 1;
    const traceId = randomUUID();

    const { provider, db } = getDbConnection();

    if (provider === 'postgres') {
      await reviewPg(db, { actorId: user.id, id, version, traceId });
    } else {
      reviewSqlite(db, { actorId: user.id, id, version, traceId });
    }

    return NextResponse.json({ ok: true, id, status: 'reviewed', version: version + 1 });
  } catch (err: any) {
    const status = err.message === 'Forbidden' ? 403 : err.message === 'Conflict' ? 409 : 500;
    return NextResponse.json({ error: err.message || 'Review failed' }, { status });
  }
}

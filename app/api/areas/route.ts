import { NextResponse } from 'next/server';
import { getDbConnection } from '@/server/db/connection.ts';
import { getCurrentUser } from '@/server/auth/session.ts';

export async function GET() {
  try {
    const user = await getCurrentUser();
    const { provider, db } = getDbConnection();

    let areas: any[] = [];
    if (provider === 'postgres') {
      const { rows } = await db.query(
        `SELECT a.id, a.name, a.created_at, b.version as boundary_version, b.geometry_json, b.provenance_json
         FROM areas a
         LEFT JOIN area_boundaries b ON b.area_id = a.id
         ORDER BY a.name ASC`
      );
      areas = rows;
    } else {
      areas = db
        .prepare(
          `SELECT a.id, a.name, a.created_at, b.version as boundary_version, b.geometry_json, b.provenance_json
           FROM areas a
           LEFT JOIN area_boundaries b ON b.area_id = a.id
           ORDER BY a.name ASC`
        )
        .all();
    }

    const formatted = areas.map((a) => {
      let geometry = null;
      let provenance = null;
      try {
        if (a.geometry_json) geometry = JSON.parse(a.geometry_json);
        if (a.provenance_json) provenance = JSON.parse(a.provenance_json);
      } catch {
        // parse fallback
      }
      return {
        id: a.id,
        name: a.name,
        boundaryVersion: a.boundary_version || 'v1',
        geometry,
        provenance,
      };
    });

    return NextResponse.json({ areas: formatted, currentUser: user });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to list areas' }, { status: 500 });
  }
}

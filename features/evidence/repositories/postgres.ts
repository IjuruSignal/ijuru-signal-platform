import { validateEvidence, evidenceState, type ValidatedEvidence, type EvidenceStatus } from '../domain/record.ts';
import { withTransaction } from '../../../server/db/postgres.ts';

export interface EvidenceBriefResult {
  status: EvidenceStatus | 'unavailable' | 'provenance_missing';
  record: ValidatedEvidence | null;
  boundary?: any;
}

function isPool(obj: any): boolean {
  return typeof obj?.totalCount === 'number';
}

export async function insertEvidence(poolOrClient: any, input: any, now = new Date()): Promise<string> {
  const record = validateEvidence(input);
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new Error('Invalid time');
  const json = JSON.stringify(record);

  return withTransaction(poolOrClient, async (client) => {
    const { rows: boundaryRows } = await client.query(
      'SELECT provenance_json FROM area_boundaries WHERE area_id = $1 AND version = $2',
      [record.areaId, record.boundaryVersion]
    );
    const boundary = boundaryRows[0];
    if (!boundary) throw new Error('Boundary not found');

    const provenance = JSON.parse(boundary.provenance_json);
    if (typeof provenance.fixture !== 'boolean' || (provenance.fixture && !record.fixture)) {
      throw new Error('Invalid boundary provenance');
    }

    await client.query(
      `INSERT INTO evidence_records (id, area_id, kind, source_id, source_version, observed_at, valid_until, is_fixture, record_json, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO NOTHING`,
      [
        record.id,
        record.areaId,
        record.kind,
        record.source.id,
        record.source.version,
        record.observedAt,
        record.validUntil,
        record.fixture ? 1 : 0,
        json,
        now.toISOString(),
      ]
    );

    const { rows: existingRows } = await client.query('SELECT record_json FROM evidence_records WHERE id = $1', [
      record.id,
    ]);
    const existing = existingRows[0];
    if (existing.record_json !== json) throw new Error('Evidence id conflict');

    await client.query(
      `INSERT INTO evidence_boundary_refs (evidence_id, area_id, boundary_version)
       VALUES ($1, $2, $3)
       ON CONFLICT (evidence_id) DO NOTHING`,
      [record.id, record.areaId, record.boundaryVersion]
    );

    const { rows: refRows } = await client.query(
      'SELECT area_id, boundary_version FROM evidence_boundary_refs WHERE evidence_id = $1',
      [record.id]
    );
    const ref = refRows[0];
    if (ref.area_id !== record.areaId || ref.boundary_version !== record.boundaryVersion) {
      throw new Error('Boundary reference conflict');
    }

    return record.id;
  });
}

export async function getEvidenceBrief(
  poolOrClient: any,
  areaId: string,
  now = new Date()
): Promise<Record<string, EvidenceBriefResult> | null> {
  if (typeof areaId !== 'string' || !areaId || !(now instanceof Date) || !Number.isFinite(now.getTime())) {
    throw new Error('Invalid query');
  }

  const isPooled = isPool(poolOrClient);
  const client = isPooled ? await poolOrClient.connect() : poolOrClient;

  try {
    const { rows: areaRows } = await client.query('SELECT 1 FROM areas WHERE id = $1', [areaId]);
    if (areaRows.length === 0) return null;

    const evidence: Record<string, EvidenceBriefResult> = {};
    for (const kind of ['forecast', 'satellite', 'rainfall_history']) {
      const { rows } = await client.query(
        `SELECT e.record_json, r.area_id AS boundary_area, r.boundary_version, b.provenance_json
         FROM evidence_records e
         LEFT JOIN evidence_boundary_refs r ON r.evidence_id = e.id
         LEFT JOIN area_boundaries b ON b.area_id = r.area_id AND b.version = r.boundary_version
         WHERE e.area_id = $1 AND e.kind = $2
         ORDER BY e.observed_at DESC, e.id DESC
         LIMIT 1`,
        [areaId, kind]
      );
      const row = rows[0];
      if (!row) {
        evidence[kind] = { status: 'unavailable', record: null };
        continue;
      }
      if (!row.boundary_version || row.boundary_area !== areaId || !row.provenance_json) {
        evidence[kind] = { status: 'provenance_missing', record: null };
        continue;
      }
      const record = validateEvidence(JSON.parse(row.record_json));
      if (record.areaId !== areaId || record.boundaryVersion !== row.boundary_version) {
        throw new Error('Boundary reference conflict');
      }
      const boundary = JSON.parse(row.provenance_json);
      if (boundary.version !== row.boundary_version || typeof boundary.fixture !== 'boolean' || (boundary.fixture && !record.fixture)) {
        throw new Error('Invalid boundary provenance');
      }
      evidence[kind] = { status: evidenceState(record, now), record, boundary };
    }
    return evidence;
  } finally {
    if (isPooled) client.release();
  }
}

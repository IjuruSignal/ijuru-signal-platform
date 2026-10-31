// Source records are structured inputs, not hazard assessments. The importer
// must label fixtures explicitly and retain enough provenance to inspect them.

export type EvidenceKind = 'forecast' | 'satellite' | 'rainfall_history';
export type EvidenceStatus = 'available' | 'stale' | 'not_yet_available';

export interface SourceProvenance {
  id: string;
  name: string;
  version: string;
  url: string;
  license: string;
}

export interface EvidenceCoverage {
  scope: string;
  fraction: number;
}

export interface EvidenceQuality {
  description: string;
}

export interface ValidatedEvidence {
  id: string;
  areaId: string;
  boundaryVersion: string;
  kind: EvidenceKind;
  source: SourceProvenance;
  observedAt: string;
  validUntil: string;
  coverage: EvidenceCoverage;
  quality: EvidenceQuality;
  processingVersion: string;
  scale: string;
  summary: string;
  fixture: boolean;
}

const types = new Set(['forecast', 'satellite', 'rainfall_history']);
const text = (v: unknown, max = 300): v is string =>
  typeof v === 'string' && v.trim() === v && v.length > 0 && v.length <= max;
const timestamp = (v: unknown): v is string =>
  typeof v === 'string' && Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v;

function httpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.hash && url.href === value;
  } catch {
    return false;
  }
}

export function validateEvidence(record: any): ValidatedEvidence {
  if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('Invalid evidence');
  const {
    id,
    areaId,
    boundaryVersion,
    kind,
    source,
    observedAt,
    validUntil,
    coverage,
    quality,
    processingVersion,
    scale,
    summary,
    fixture,
  } = record;
  if (![id, areaId, boundaryVersion].every((v) => text(v, 128)) || !types.has(kind) || typeof fixture !== 'boolean') {
    throw new Error('Invalid evidence identity');
  }
  if (
    !source ||
    !text(source.id, 128) ||
    !text(source.name) ||
    !text(source.version, 128) ||
    !httpsUrl(source.url) ||
    !text(source.license, 500)
  ) {
    throw new Error('Invalid source provenance');
  }
  if (!timestamp(observedAt) || !timestamp(validUntil) || validUntil <= observedAt) {
    throw new Error('Invalid evidence dates');
  }
  if (
    !coverage ||
    !text(coverage.scope, 500) ||
    !Number.isFinite(coverage.fraction) ||
    coverage.fraction < 0 ||
    coverage.fraction > 1
  ) {
    throw new Error('Invalid evidence coverage');
  }
  if (
    !quality ||
    !text(quality.description, 1000) ||
    !text(processingVersion, 128) ||
    !text(scale, 300) ||
    !text(summary, 2000)
  ) {
    throw new Error('Invalid evidence quality');
  }

  return {
    id,
    areaId,
    boundaryVersion,
    kind,
    source: {
      id: source.id,
      name: source.name,
      version: source.version,
      url: source.url,
      license: source.license,
    },
    observedAt,
    validUntil,
    coverage: { scope: coverage.scope, fraction: coverage.fraction },
    quality: { description: quality.description },
    processingVersion,
    scale,
    summary,
    fixture,
  };
}

export function evidenceState(record: any, now: Date = new Date()): EvidenceStatus {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new Error('Invalid time');
  const value = validateEvidence(record);
  const time = now.toISOString();
  if (value.observedAt > time) return 'not_yet_available';
  return value.validUntil <= time ? 'stale' : 'available';
}

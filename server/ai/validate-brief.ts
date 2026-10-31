// This is a conservative token check, not semantic entailment. All accepted
// output still requires human review; a failed statement suppresses the batch.

export interface Statement {
  text: string;
  sourceIds: string[];
}

export interface CandidateBrief {
  statements: Statement[];
}

export interface EvidenceInput {
  id: string;
  text: string;
  reviewed: boolean;
  validUntil: string;
}

export interface BriefValidationResult {
  status: 'needs_review' | 'abstained';
  statements: Statement[];
}

const numbers = (text: string): string[] => text.match(/[+\-−]?\d+(?:[.,]\d+)*/g) || [];
const abstain = (): BriefValidationResult => ({ status: 'abstained', statements: [] });

export function validateBrief(
  candidate: any,
  evidence: EvidenceInput[],
  now: Date = new Date()
): BriefValidationResult {
  if (
    !candidate ||
    !Array.isArray(candidate.statements) ||
    !candidate.statements.length ||
    candidate.statements.length > 30 ||
    !Array.isArray(evidence) ||
    !(now instanceof Date) ||
    !Number.isFinite(now.getTime())
  ) {
    return abstain();
  }
  const byId = new Map<string, EvidenceInput>();
  for (const e of evidence) {
    if (!e || typeof e.id !== 'string' || !e.id || byId.has(e.id)) return abstain();
    byId.set(e.id, e);
  }
  const accepted: Statement[] = [];
  for (const statement of candidate.statements) {
    if (
      !statement ||
      typeof statement.text !== 'string' ||
      !statement.text.trim() ||
      statement.text.length > 1000 ||
      !Array.isArray(statement.sourceIds) ||
      statement.sourceIds.length === 0 ||
      statement.sourceIds.length > 30 ||
      statement.sourceIds.some((id: unknown) => typeof id !== 'string' || !id) ||
      new Set(statement.sourceIds).size !== statement.sourceIds.length
    ) {
      return abstain();
    }
    const sources: (EvidenceInput | undefined)[] = statement.sourceIds.map((id: string) => byId.get(id));
    if (
      sources.some(
        (source: EvidenceInput | undefined) =>
          !source ||
          typeof source.text !== 'string' ||
          source.reviewed !== true ||
          !Number.isFinite(Date.parse(source.validUntil)) ||
          Date.parse(source.validUntil) <= now.getTime()
      )
    ) {
      return abstain();
    }
    const sourceNumbers = new Set(sources.flatMap((source: EvidenceInput | undefined) => (source ? numbers(source.text) : [])));
    if (numbers(statement.text).some((number) => !sourceNumbers.has(number))) return abstain();
    accepted.push({ text: statement.text, sourceIds: statement.sourceIds });
  }
  return { status: 'needs_review', statements: accepted };
}

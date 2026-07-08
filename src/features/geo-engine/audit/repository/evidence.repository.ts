import type { DraftGEOIssueEvidence, GEOIssueEvidence } from "@/features/geo-engine/audit/types/audit.types";

export interface EvidenceRepository {
  saveEvidence(issueId: string, evidence: DraftGEOIssueEvidence[]): Promise<GEOIssueEvidence[]>;
  getIssueEvidence(issueId: string): Promise<GEOIssueEvidence[]>;
}

const evidenceByIssue = new Map<string, GEOIssueEvidence[]>();

export class MockEvidenceRepository implements EvidenceRepository {
  async saveEvidence(issueId: string, evidence: DraftGEOIssueEvidence[]): Promise<GEOIssueEvidence[]> {
    const records = evidence.map((item, index) => ({
      ...item,
      id: `evidence_${issueId}_${index}`.replace(/\W+/g, "_").toLowerCase(),
      issueId,
    }));
    evidenceByIssue.set(issueId, records);
    return records;
  }

  async getIssueEvidence(issueId: string): Promise<GEOIssueEvidence[]> {
    return evidenceByIssue.get(issueId) ?? [];
  }
}

let evidenceRepository: EvidenceRepository | null = null;

export function getEvidenceRepository(): EvidenceRepository {
  evidenceRepository ??= new MockEvidenceRepository();
  return evidenceRepository;
}

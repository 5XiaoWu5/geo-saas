import type {
  KnowledgeAssessment,
  KnowledgeGap,
  KnowledgeGapSeverity,
  KnowledgeGapType,
  KnowledgeIntelligenceResponse,
} from "./types";

type AssessmentCounts = Record<KnowledgeGapType, number>;

const weights: Record<KnowledgeGapType, number> = {
  COMPANY_INFO: 15,
  PRODUCT_DETAIL: 15,
  SERVICE_DETAIL: 10,
  CUSTOMER_CASE: 20,
  TECHNICAL_PROOF: 15,
  CERTIFICATION: 15,
  FAQ: 10,
};

const severity: Record<KnowledgeGapType, KnowledgeGapSeverity> = {
  COMPANY_INFO: "HIGH",
  PRODUCT_DETAIL: "MEDIUM",
  SERVICE_DETAIL: "MEDIUM",
  CUSTOMER_CASE: "HIGH",
  TECHNICAL_PROOF: "HIGH",
  CERTIFICATION: "MEDIUM",
  FAQ: "MEDIUM",
};

export function knowledgeGap(type: KnowledgeGapType, sourceCount: number): KnowledgeGap {
  return {
    type,
    severity: severity[type],
    reason: `knowledge.intelligence.gapReasons.${type}`,
    sourceCount,
  };
}

export function assessKnowledge(projectId: string, counts: AssessmentCounts, confidenceValues: number[]): KnowledgeAssessment {
  const evidenceCount = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const missing = (Object.keys(counts) as KnowledgeGapType[])
    .filter((type) => counts[type] === 0)
    .map((type) => knowledgeGap(type, counts[type]));

  if (evidenceCount === 0) {
    return { projectId, status: "unavailable", completeness: null, confidence: null, evidenceCount, missing };
  }

  const completeness = (Object.keys(weights) as KnowledgeGapType[])
    .reduce((score, type) => score + (counts[type] > 0 ? weights[type] : 0), 0);
  const validConfidence = confidenceValues.filter((value) => Number.isFinite(value) && value >= 0 && value <= 100);
  const confidence = validConfidence.length
    ? Math.round(validConfidence.reduce((sum, value) => sum + value, 0) / validConfidence.length)
    : null;

  return { projectId, status: "available", completeness, confidence, evidenceCount, missing };
}

export function unavailableKnowledgeResponse(project: KnowledgeIntelligenceResponse["project"]): KnowledgeIntelligenceResponse {
  const counts = Object.fromEntries([
    "COMPANY_INFO",
    "PRODUCT_DETAIL",
    "SERVICE_DETAIL",
    "CUSTOMER_CASE",
    "TECHNICAL_PROOF",
    "CERTIFICATION",
    "FAQ",
  ].map((type) => [type, 0])) as AssessmentCounts;
  return { project, status: "unavailable", profile: null, assessment: assessKnowledge(project.id, counts, []) };
}

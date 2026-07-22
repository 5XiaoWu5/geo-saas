import { realAISearchDatabase, type Row } from "@/features/real-ai-search/database";
import type { AutomationEvidenceSnapshot, EvidenceMetric } from "./types";

function metric(row: Row | undefined, valueKey: string, sourceType: string, capturedAt: string): EvidenceMetric {
  const raw = row?.[valueKey];
  const value = raw === null || raw === undefined || Number.isNaN(Number(raw)) ? null : Number(raw);
  return { status: value === null ? "unavailable" : "available", value, sourceId: row?.id ? String(row.id) : null, sourceType, capturedAt };
}

export async function captureAutomationEvidence(userId: string, projectId: string): Promise<AutomationEvidenceSnapshot | null> {
  const db = realAISearchDatabase();
  const project = (await db.query('SELECT "id" FROM "Project" WHERE "id" = $1 AND "userId" = $2', [projectId, userId]))[0];
  if (!project) return null;
  const capturedAt = new Date().toISOString();
  const [analysisRows, growthRows, knowledgeRows, citationRows, countRows] = await Promise.all([
    db.query('SELECT "id", "totalScore", "entityScore", "createdAt" FROM "GeoAnalysis" WHERE "projectId" = $1 ORDER BY "createdAt" DESC LIMIT 1', [projectId]),
    db.query('SELECT "id", "visibilityScore", "authorityScore", "calculatedAt" FROM "AISearchGrowthScore" WHERE "projectId" = $1 ORDER BY "calculatedAt" DESC LIMIT 1', [projectId]),
    db.query('SELECT kb."id", kb."completenessScore", kb."updatedAt" FROM "CompanyKnowledgeBase" kb WHERE kb."projectId" = $1 LIMIT 1', [projectId]),
    db.query('SELECT COUNT(*)::int AS "value", MAX("createdAt") AS "createdAt" FROM "AISearchCitation" WHERE "projectId" = $1', [projectId]),
    db.query('SELECT (SELECT COUNT(*)::int FROM "GrowthAction" WHERE "projectId" = $1) AS "growthActions", (SELECT COUNT(*)::int FROM "GrowthAgentTask" WHERE "projectId" = $1) AS "growthAgentTasks", (SELECT COUNT(*)::int FROM "OptimizationTask" WHERE "projectId" = $1) AS "optimizationTasks", (SELECT COUNT(*)::int FROM "GrowthReport" WHERE "projectId" = $1 AND "status" = \'COMPLETED\'::"GrowthReportStatus") AS "growthReports"', [projectId]),
  ]);
  const analysis = analysisRows[0], growth = growthRows[0], knowledge = knowledgeRows[0], citations = citationRows[0], counts = countRows[0] ?? {};
  return {
    capturedAt,
    metrics: {
      seoHealth: metric(analysis, "totalScore", "GeoAnalysis", capturedAt),
      aiVisibility: metric(growth, "visibilityScore", "AISearchGrowthScore", capturedAt),
      knowledgeCompleteness: metric(knowledge, "completenessScore", "CompanyKnowledgeBase", capturedAt),
      citationCount: { status: citations?.createdAt ? "available" : "unavailable", value: citations?.createdAt ? Number(citations.value ?? 0) : null, sourceId: null, sourceType: "AISearchCitation", capturedAt },
      entityAuthority: growth ? metric(growth, "authorityScore", "AISearchGrowthScore", capturedAt) : metric(analysis, "entityScore", "GeoAnalysis", capturedAt),
    },
    records: { growthActions: Number(counts.growthActions ?? 0), growthAgentTasks: Number(counts.growthAgentTasks ?? 0), optimizationTasks: Number(counts.optimizationTasks ?? 0), growthReports: Number(counts.growthReports ?? 0) },
  };
}

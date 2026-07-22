import { realAISearchDatabase, type Row } from "@/features/real-ai-search/database";
import type { GrowthReportEvidence, GrowthReportListItem, GrowthReportSnapshot, GrowthReportStatus } from "./types";

function iso(value: unknown) { const date = value instanceof Date ? value : new Date(String(value)); return date.toISOString(); }
function jsonObject(value: unknown): Record<string, unknown> { if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>; if (typeof value === "string") { try { const parsed = JSON.parse(value) as unknown; return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}; } catch { return {}; } } return {}; }
function reportListItem(row: Row): GrowthReportListItem { const snapshot = jsonObject(row.snapshot); const meta = jsonObject(snapshot.reportMeta); return { id: String(row.id), projectId: String(row.projectId), version: Number(row.version), generatedBy: String(row.generatedBy), status: String(row.status) as GrowthReportStatus, dataVersion: String(row.dataVersion), methodVersion: String(row.methodVersion), confidence: typeof meta.confidence === "number" ? meta.confidence : null, createdAt: iso(row.createdAt) }; }

export const growthReportRepository = {
  async projectForUser(userId: string, projectId: string) {
    return (await realAISearchDatabase().query('SELECT p."id", p."name", p."domain", p."industry", p."description", p."geoScore", p."visibilityScore", p."createdAt", p."updatedAt" FROM "Project" p WHERE p."id" = $1 AND p."userId" = $2 LIMIT 1', [projectId, userId]))[0] ?? null;
  },

  async createProcessing(userId: string, projectId: string) {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const id = crypto.randomUUID();
      const row = (await realAISearchDatabase().query('INSERT INTO "GrowthReport" ("id", "projectId", "version", "generatedBy", "status", "dataVersion", "methodVersion", "snapshot", "createdAt") SELECT $1, p."id", COALESCE(MAX(report."version"), 0) + 1, $2, \'PROCESSING\'::"GrowthReportStatus", $3, \'growth-report-v1\', $4::jsonb, $5 FROM "Project" p LEFT JOIN "GrowthReport" report ON report."projectId" = p."id" WHERE p."id" = $6 AND p."userId" = $2 GROUP BY p."id" ON CONFLICT ("projectId", "version") DO NOTHING RETURNING *', [id, userId, `pending:${id}`, JSON.stringify({ reportMeta: { status: "PROCESSING" } }), new Date(), projectId]))[0];
      if (row) return row;
    }
    throw new Error("REPORT_VERSION_CONFLICT");
  },

  async loadEvidence(userId: string, projectId: string): Promise<GrowthReportEvidence | null> {
    const project = await this.projectForUser(userId, projectId);
    if (!project) return null;
    const db = realAISearchDatabase();
    const sourceNames = ["WebsiteScan", "GeoAnalysis", "EntityProfile", "VisibilityCheck", "VisibilityCitation", "AISearchResult", "AISearchCitation", "AISearchGrowthScore", "CompanyKnowledgeProfile", "KnowledgeAssets", "BenchmarkRun", "BenchmarkResult", "OptimizationTask", "GeoBrainAnalysis", "GrowthSnapshot"];
    const settled = await Promise.allSettled([
      db.query('SELECT scan.* FROM "WebsiteScan" scan WHERE scan."projectId" = $1 ORDER BY scan."createdAt" DESC LIMIT 1', [projectId]),
      db.query('SELECT analysis.* FROM "GeoAnalysis" analysis WHERE analysis."projectId" = $1 ORDER BY analysis."createdAt" DESC LIMIT 1', [projectId]),
      db.query('SELECT entity.* FROM "EntityProfile" entity WHERE entity."projectId" = $1 ORDER BY entity."updatedAt" DESC LIMIT 1', [projectId]),
      db.query('SELECT check."id", check."provider", check."prompt", check."answer", check."brandMentioned", check."mentionPosition", check."sourceUrls", check."score", check."createdAt" FROM "VisibilityCheck" check INNER JOIN "VisibilityCampaign" campaign ON campaign."id" = check."campaignId" WHERE campaign."projectId" = $1 ORDER BY check."createdAt" DESC LIMIT 100', [projectId]),
      db.query('SELECT citation."id", citation."checkId", citation."url", citation."domain", citation."position", citation."metadata", citation."createdAt" FROM "VisibilityCitation" citation INNER JOIN "VisibilityCheck" check ON check."id" = citation."checkId" INNER JOIN "VisibilityCampaign" campaign ON campaign."id" = check."campaignId" WHERE campaign."projectId" = $1 ORDER BY citation."createdAt" DESC LIMIT 300', [projectId]),
      db.query('SELECT result."id", result."queryId", query."query", query."intent", query."targetEntity", result."provider", result."status", result."providerRequestId", result."rawResponse", result."mentioned", result."rankPosition", result."productMentions", result."competitorBrands", result."errorCode", result."durationMs", result."attemptCount", result."createdAt", result."completedAt" FROM "AISearchResult" result INNER JOIN "AISearchQuery" query ON query."id" = result."queryId" WHERE result."projectId" = $1 ORDER BY result."createdAt" DESC LIMIT 200', [projectId]),
      db.query('SELECT citation."id", citation."resultId", citation."url", citation."domain", citation."citationType", citation."position", citation."citationCount", citation."createdAt" FROM "AISearchCitation" citation WHERE citation."projectId" = $1 ORDER BY citation."createdAt" DESC LIMIT 500', [projectId]),
      db.query('SELECT score.* FROM "AISearchGrowthScore" score WHERE score."projectId" = $1 ORDER BY score."calculatedAt" DESC LIMIT 1', [projectId]),
      db.query('SELECT kb."id" AS "knowledgeBaseId", kb."status" AS "knowledgeBaseStatus", kb."version" AS "knowledgeBaseVersion", kb."completenessScore", kb."understandingScore", kb."updatedAt" AS "knowledgeBaseUpdatedAt", profile.* FROM "CompanyKnowledgeBase" kb LEFT JOIN "CompanyKnowledgeProfile" profile ON profile."projectId" = kb."projectId" WHERE kb."projectId" = $1 LIMIT 1', [projectId]),
      db.query('SELECT (SELECT COUNT(*)::int FROM "ProductEntity" WHERE "projectId" = $1 AND "status" = \'ACTIVE\') AS "productCount", (SELECT COUNT(*)::int FROM "ServiceEntity" WHERE "projectId" = $1 AND "status" = \'ACTIVE\') AS "serviceCount", (SELECT COUNT(*)::int FROM "CustomerCase" WHERE "projectId" = $1 AND "status" = \'ACTIVE\') AS "caseCount", (SELECT COUNT(*)::int FROM "TechnicalDocument" WHERE "projectId" = $1 AND "status" = \'ACTIVE\') AS "technicalDocumentCount", (SELECT COUNT(*)::int FROM "KnowledgeDocument" WHERE "projectId" = $1) AS "documentCount"', [projectId]),
      db.query('SELECT run.* FROM "BenchmarkRun" run WHERE run."projectId" = $1 AND run."status" = \'COMPLETED\' ORDER BY run."createdAt" DESC LIMIT 1', [projectId]),
      db.query('WITH latest AS (SELECT run."id" FROM "BenchmarkRun" run WHERE run."projectId" = $1 AND run."status" = \'COMPLETED\' ORDER BY run."createdAt" DESC LIMIT 1) SELECT result.*, competitor."name" AS "competitorName" FROM latest INNER JOIN "BenchmarkResult" result ON result."benchmarkRunId" = latest."id" LEFT JOIN "CompetitorProfile" competitor ON competitor."id" = result."competitorId" ORDER BY result."ranking" ASC NULLS LAST', [projectId]),
      db.query('SELECT task.* FROM "OptimizationTask" task WHERE task."projectId" = $1 ORDER BY CASE task."severity" WHEN \'High\' THEN 1 WHEN \'Medium\' THEN 2 ELSE 3 END, CASE task."status" WHEN \'PENDING\' THEN 1 WHEN \'PROCESSING\' THEN 2 ELSE 3 END, task."updatedAt" DESC LIMIT 200', [projectId]),
      db.query('SELECT insight.* FROM "GeoBrainAnalysis" insight WHERE insight."projectId" = $1 ORDER BY insight."createdAt" DESC LIMIT 1', [projectId]),
      db.query('SELECT snapshot.* FROM "GrowthSnapshot" snapshot WHERE snapshot."projectId" = $1 ORDER BY snapshot."createdAt" DESC LIMIT 100', [projectId]),
    ]);
    const sourceWarnings = settled.flatMap((result, index) => result.status === "rejected" ? [sourceNames[index] ?? `source-${index}`] : []);
    settled.forEach((result, index) => { if (result.status === "rejected") console.error("growth_report_source_unavailable", { source: sourceNames[index], message: result.reason instanceof Error ? result.reason.message : String(result.reason) }); });
    const rows = settled.map((result) => result.status === "fulfilled" ? result.value : []);
    const [scanRows, analysisRows, entityRows, visibilityChecks, visibilityCitations, aiResults, aiCitations, scoreRows, knowledgeRows, assetRows, benchmarkRuns, benchmarkResults, tasks, insights, growthSnapshots] = rows;
    return { project, scan: scanRows[0] ?? null, analysis: analysisRows[0] ?? null, entity: entityRows[0] ?? null, visibilityChecks, visibilityCitations, aiResults, aiCitations, growthScore: scoreRows[0] ?? null, knowledge: knowledgeRows[0] ?? null, knowledgeAssets: assetRows[0] ?? null, benchmarkRun: benchmarkRuns[0] ?? null, benchmarkResults, optimizationTasks: tasks, insight: insights[0] ?? null, growthSnapshots, sourceWarnings };
  },

  async complete(userId: string, reportId: string, dataVersion: string, snapshot: GrowthReportSnapshot) {
    return (await realAISearchDatabase().query('UPDATE "GrowthReport" report SET "status" = \'COMPLETED\'::"GrowthReportStatus", "dataVersion" = $3, "snapshot" = $4::jsonb FROM "Project" p WHERE report."id" = $1 AND report."projectId" = p."id" AND p."userId" = $2 AND report."status" = \'PROCESSING\'::"GrowthReportStatus" RETURNING report.*', [reportId, userId, dataVersion, JSON.stringify(snapshot)]))[0] ?? null;
  },

  async fail(userId: string, reportId: string, snapshot: GrowthReportSnapshot) {
    return (await realAISearchDatabase().query('UPDATE "GrowthReport" report SET "status" = \'FAILED\'::"GrowthReportStatus", "snapshot" = $3::jsonb FROM "Project" p WHERE report."id" = $1 AND report."projectId" = p."id" AND p."userId" = $2 AND report."status" = \'PROCESSING\'::"GrowthReportStatus" RETURNING report.*', [reportId, userId, JSON.stringify(snapshot)]))[0] ?? null;
  },

  async list(userId: string, projectId: string) {
    const rows = await realAISearchDatabase().query('SELECT report.* FROM "GrowthReport" report INNER JOIN "Project" p ON p."id" = report."projectId" WHERE report."projectId" = $1 AND p."userId" = $2 ORDER BY report."version" DESC LIMIT 200', [projectId, userId]);
    return rows.map(reportListItem);
  },

  async detail(userId: string, projectId: string, reportId: string) {
    const row = (await realAISearchDatabase().query('SELECT report.* FROM "GrowthReport" report INNER JOIN "Project" p ON p."id" = report."projectId" WHERE report."id" = $1 AND report."projectId" = $2 AND p."userId" = $3 LIMIT 1', [reportId, projectId, userId]))[0];
    return row ? { ...reportListItem(row), snapshot: jsonObject(row.snapshot) as GrowthReportSnapshot } : null;
  },
};

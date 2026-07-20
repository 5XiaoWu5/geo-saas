import { iso, jsonArray, realAISearchDatabase, type Row } from "@/features/real-ai-search/database";
import type { AISearchGrowthScoreView } from "./types";

export type AISearchGrowthEvidence = {
  project: Row;
  results: Row[];
  knowledge: Row | null;
  entity: Row | null;
  products: Row[];
  benchmark: Row[];
  evaluation: Row | null;
  tasks: Row[];
  websiteScanAvailable: boolean;
  seoAnalysisAvailable: boolean;
};

function scoreView(row: Row): AISearchGrowthScoreView {
  const number = (value: unknown) => value === null || value === undefined ? null : Number(value);
  return { id: String(row.id), status: "available", visibilityScore: number(row.visibilityScore), citationScore: number(row.citationScore), knowledgeScore: number(row.knowledgeScore), authorityScore: number(row.authorityScore), competitionScore: number(row.competitionScore), overallScore: Number(row.overallScore), confidence: Number(row.confidence), methodVersion: "ai-growth-score-v1", calculatedAt: iso(row.calculatedAt), sources: { visibility: [], citation: [], knowledge: [], authority: [], competition: [] } };
}

export const aiSearchGrowthRepository = {
  async loadEvidence(userId: string, projectId: string): Promise<AISearchGrowthEvidence | null> {
    const db = realAISearchDatabase();
    const project = (await db.query('SELECT p."id", p."name", p."domain" FROM "Project" p WHERE p."id" = $1 AND p."userId" = $2 LIMIT 1', [projectId, userId]))[0];
    if (!project) return null;
    const [results, knowledgeRows, entityRows, products, benchmark, evaluationRows, tasks, scanRows, analysisRows] = await Promise.all([
      db.query('SELECT result."id", result."provider", result."mentioned", result."rankPosition", result."productMentions", result."competitorBrands", result."createdAt", result."completedAt", COALESCE(SUM(citation."citationCount"), 0)::int AS "citationCount" FROM "AISearchResult" result LEFT JOIN "AISearchCitation" citation ON citation."resultId" = result."id" WHERE result."projectId" = $1 AND result."status" = \'SUCCEEDED\' GROUP BY result."id" ORDER BY result."completedAt" DESC NULLS LAST LIMIT 200', [projectId]),
      db.query('SELECT kb."id" AS "baseId", kb."completenessScore", profile."id" AS "profileId", profile."missingKnowledge", profile."customerProof", profile."mainProducts" FROM "CompanyKnowledgeBase" kb LEFT JOIN "CompanyKnowledgeProfile" profile ON profile."projectId" = kb."projectId" WHERE kb."projectId" = $1 LIMIT 1', [projectId]),
      db.query('SELECT entity.* FROM "EntityProfile" entity WHERE entity."projectId" = $1 ORDER BY entity."updatedAt" DESC LIMIT 1', [projectId]),
      db.query('SELECT product."id", product."name" FROM "ProductEntity" product WHERE product."projectId" = $1 AND product."status" = \'ACTIVE\' ORDER BY product."updatedAt" DESC', [projectId]),
      db.query('WITH latest_run AS (SELECT run."id", run."createdAt" FROM "BenchmarkRun" run WHERE run."projectId" = $1 AND run."status" = \'COMPLETED\' ORDER BY run."createdAt" DESC LIMIT 1) SELECT result.*, latest_run."id" AS "runId", COALESCE(competitor."name", $2) AS "name" FROM latest_run INNER JOIN "BenchmarkResult" result ON result."benchmarkRunId" = latest_run."id" LEFT JOIN "CompetitorProfile" competitor ON competitor."id" = result."competitorId" ORDER BY result."ranking" ASC NULLS LAST', [projectId, String(project.name)]),
      db.query('SELECT evaluation."recommendationProbability" FROM "SimulationEvaluationProfile" evaluation WHERE evaluation."projectId" = $1 AND evaluation."recommendationProbability" IS NOT NULL ORDER BY evaluation."createdAt" DESC LIMIT 1', [projectId]),
      db.query('SELECT task.* FROM "OptimizationTask" task WHERE task."projectId" = $1 AND (task."issueId" LIKE \'growth:REAL_AI_VISIBILITY_GAP:%\' OR task."issueId" LIKE \'growth:AI_RECOMMENDATION_GAP:%\' OR task."issueId" LIKE \'growth:KNOWLEDGE_GAP:%\' OR task."issueId" LIKE \'growth:BENCHMARK_GAP:%\' OR task."issueId" LIKE \'benchmark:%\') ORDER BY CASE task."severity" WHEN \'High\' THEN 1 WHEN \'Medium\' THEN 2 ELSE 3 END, CASE task."status" WHEN \'PENDING\' THEN 1 WHEN \'PROCESSING\' THEN 2 ELSE 3 END, task."updatedAt" DESC LIMIT 10', [projectId]),
      db.query('SELECT scan."id" FROM "WebsiteScan" scan WHERE scan."projectId" = $1 ORDER BY scan."createdAt" DESC LIMIT 1', [projectId]),
      db.query('SELECT analysis."id" FROM "GeoAnalysis" analysis WHERE analysis."projectId" = $1 ORDER BY analysis."createdAt" DESC LIMIT 1', [projectId]),
    ]);
    return { project, results, knowledge: knowledgeRows[0] ?? null, entity: entityRows[0] ?? null, products, benchmark, evaluation: evaluationRows[0] ?? null, tasks, websiteScanAvailable: scanRows.length > 0, seoAnalysisAvailable: analysisRows.length > 0 };
  },

  async saveScore(userId: string, projectId: string, score: AISearchGrowthScoreView) {
    if (score.status === "unavailable" || score.overallScore === null) return null;
    const row = (await realAISearchDatabase().query('INSERT INTO "AISearchGrowthScore" ("id", "projectId", "visibilityScore", "citationScore", "knowledgeScore", "authorityScore", "competitionScore", "overallScore", "confidence", "methodVersion", "calculatedAt") SELECT $1, p."id", $3, $4, $5, $6, $7, $8, $9, $10, $11 FROM "Project" p WHERE p."id" = $2 AND p."userId" = $12 RETURNING *', [crypto.randomUUID(), projectId, score.visibilityScore, score.citationScore, score.knowledgeScore, score.authorityScore, score.competitionScore, score.overallScore, score.confidence, score.methodVersion, new Date(), userId]))[0];
    return row ? scoreView(row) : null;
  },
};

export function rowJsonArray(row: Row | null, key: string) { return row ? jsonArray(row[key]) : []; }

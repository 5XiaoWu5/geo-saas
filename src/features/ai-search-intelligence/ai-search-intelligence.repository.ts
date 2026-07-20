import { aiSearchDatabase, isoDate, jsonArray, jsonRecord, nullableNumber, type AISearchDatabaseRow } from "./database";
import type { AIRecommendationEvidence, AIRecommendationIssue, AIRecommendationSignal, AISearchIntent, AISearchPlatform, SimulationEvaluationProfile } from "./types";

function strings(value: unknown) { return jsonArray(value).map(String).filter(Boolean); }
function toProfile(row: AISearchDatabaseRow): SimulationEvaluationProfile {
  return { id: String(row.id), projectId: String(row.projectId), simulationResultId: row.simulationResultId ? String(row.simulationResultId) : null, query: String(row.query ?? ""), platform: String(row.platform ?? "CHATGPT") as AISearchPlatform, industry: String(row.industry ?? ""), intent: String(row.intent ?? "RESEARCH") as AISearchIntent, targetEntity: String(row.targetEntity ?? ""), knowledgeVersion: nullableNumber(row.knowledgeVersion), evaluationStatus: String(row.evaluationStatus ?? "UNAVAILABLE") as SimulationEvaluationProfile["evaluationStatus"], healthScore: nullableNumber(row.healthScore), recommendationProbability: nullableNumber(row.recommendationProbability), confidence: nullableNumber(row.confidence), signals: jsonArray(row.signals) as AIRecommendationSignal[], issues: jsonArray(row.issues) as AIRecommendationIssue[], methodVersion: String(row.methodVersion ?? ""), createdAt: isoDate(row.createdAt) };
}

export const aiSearchIntelligenceRepository = {
  async projectForUser(userId: string, projectId: string) {
    return (await aiSearchDatabase().query('SELECT p."id", p."name", p."industry" FROM "Project" p WHERE p."id" = $1 AND p."userId" = $2 LIMIT 1', [projectId, userId]))[0] ?? null;
  },

  async loadEvidence(userId: string, projectId: string, provider: string): Promise<AIRecommendationEvidence> {
    const [entityRows, knowledgeRows, productRows, caseRows, technicalRows, visibilityRows, benchmarkRows, simulationRows] = await Promise.all([
      aiSearchDatabase().query('SELECT entity.* FROM "EntityProfile" entity INNER JOIN "Project" p ON p."id" = entity."projectId" WHERE entity."projectId" = $1 AND p."userId" = $2 ORDER BY entity."updatedAt" DESC LIMIT 1', [projectId, userId]),
      aiSearchDatabase().query('SELECT kb."id" AS "baseId", kb."version", kb."completenessScore", profile."id" AS "profileId", profile."missingKnowledge", profile."certifications", profile."faqTopics" FROM "CompanyKnowledgeBase" kb INNER JOIN "Project" p ON p."id" = kb."projectId" LEFT JOIN "CompanyKnowledgeProfile" profile ON profile."projectId" = kb."projectId" WHERE kb."projectId" = $1 AND p."userId" = $2 LIMIT 1', [projectId, userId]),
      aiSearchDatabase().query('SELECT product.* FROM "ProductEntity" product INNER JOIN "Project" p ON p."id" = product."projectId" WHERE product."projectId" = $1 AND product."status" = \'ACTIVE\' AND p."userId" = $2 ORDER BY product."updatedAt" DESC', [projectId, userId]),
      aiSearchDatabase().query('SELECT customer_case.* FROM "CustomerCase" customer_case INNER JOIN "Project" p ON p."id" = customer_case."projectId" WHERE customer_case."projectId" = $1 AND customer_case."status" = \'ACTIVE\' AND p."userId" = $2 ORDER BY customer_case."updatedAt" DESC', [projectId, userId]),
      aiSearchDatabase().query('SELECT technical.* FROM "TechnicalDocument" technical INNER JOIN "Project" p ON p."id" = technical."projectId" WHERE technical."projectId" = $1 AND technical."status" = \'ACTIVE\' AND p."userId" = $2 ORDER BY technical."updatedAt" DESC', [projectId, userId]),
      aiSearchDatabase().query('SELECT check."id", check."score", (CARDINALITY(check."sourceUrls") > 0 OR COUNT(citation."id") > 0) AS "cited", COALESCE(ARRAY_AGG(citation."id") FILTER (WHERE citation."id" IS NOT NULL), ARRAY[]::text[]) AS "citationIds" FROM "VisibilityCheck" check INNER JOIN "VisibilityCampaign" campaign ON campaign."id" = check."campaignId" INNER JOIN "Project" p ON p."id" = campaign."projectId" LEFT JOIN "VisibilityCitation" citation ON citation."checkId" = check."id" WHERE campaign."projectId" = $1 AND p."userId" = $2 GROUP BY check."id" ORDER BY check."createdAt" DESC LIMIT 100', [projectId, userId]),
      aiSearchDatabase().query('WITH latest_run AS (SELECT run."id" FROM "BenchmarkRun" run INNER JOIN "Project" p ON p."id" = run."projectId" WHERE run."projectId" = $1 AND run."status" = \'COMPLETED\' AND p."userId" = $2 ORDER BY run."createdAt" DESC LIMIT 1) SELECT result.*, latest_run."id" AS "runId" FROM latest_run INNER JOIN "BenchmarkResult" result ON result."benchmarkRunId" = latest_run."id" ORDER BY result."ranking" ASC NULLS LAST', [projectId, userId]),
      aiSearchDatabase().query('SELECT result.*, task."query", task."provider" FROM "SimulationResult" result INNER JOIN "SimulationTask" task ON task."id" = result."taskId" INNER JOIN "Project" p ON p."id" = task."projectId" WHERE task."projectId" = $1 AND task."targetType" = \'OWN\' AND task."provider" = $3 AND p."userId" = $2 ORDER BY result."createdAt" DESC LIMIT 1', [projectId, userId, provider]),
    ]);
    const entity = entityRows[0] ? { id: String(entityRows[0].id), brandName: String(entityRows[0].brandName ?? ""), industry: String(entityRows[0].industry ?? ""), region: String(entityRows[0].region ?? ""), description: String(entityRows[0].description ?? ""), services: strings(entityRows[0].services), products: strings(entityRows[0].products), advantages: strings(entityRows[0].advantages) } : null;
    const knowledgeRow = knowledgeRows[0];
    const missingTypes = knowledgeRow ? jsonArray(knowledgeRow.missingKnowledge).flatMap((item) => { const row = jsonRecord(item); return row.type ? [String(row.type)] : []; }) : [];
    const knowledge = knowledgeRow ? { baseId: String(knowledgeRow.baseId), profileId: knowledgeRow.profileId ? String(knowledgeRow.profileId) : null, version: Number(knowledgeRow.version ?? 1), completenessScore: nullableNumber(knowledgeRow.completenessScore), missingTypes, certifications: jsonArray(knowledgeRow.certifications).length, faqTopics: jsonArray(knowledgeRow.faqTopics).length } : null;
    const products = productRows.map((row) => ({ id: String(row.id), name: String(row.name ?? ""), category: String(row.category ?? ""), description: String(row.description ?? ""), features: strings(row.features), applications: strings(row.applications), targetCustomers: strings(row.targetCustomers) }));
    const cases = caseRows.map((row) => ({ id: String(row.id), customerName: String(row.customerName ?? ""), industry: String(row.industry ?? ""), problem: String(row.problem ?? ""), solution: String(row.solution ?? ""), result: String(row.result ?? ""), metrics: jsonRecord(row.metrics) }));
    const technicalDocuments = technicalRows.map((row) => ({ id: String(row.id), title: String(row.title ?? ""), type: String(row.type ?? ""), summary: String(row.summary ?? ""), technicalFields: jsonRecord(row.technicalFields) }));
    const visibility = { checks: visibilityRows.map((row) => ({ id: String(row.id), score: Number(row.score ?? 0), cited: Boolean(row.cited), citationIds: strings(row.citationIds) })) };
    const own = benchmarkRows.find((row) => String(row.targetType) === "OWN" && nullableNumber(row.overallScore) !== null);
    const rivals = benchmarkRows.filter((row) => String(row.targetType) === "COMPETITOR" && nullableNumber(row.overallScore) !== null);
    const benchmark = benchmarkRows[0]?.runId ? { runId: String(benchmarkRows[0].runId), own: own ? { id: String(own.id), overallScore: Number(own.overallScore) } : null, competitors: rivals.map((row) => ({ id: String(row.id), overallScore: Number(row.overallScore) })) } : null;
    const simulationRow = simulationRows[0];
    const platform = provider.toUpperCase() === "CHATGPT" ? "CHATGPT" : provider.toUpperCase() as AISearchPlatform;
    const simulation = simulationRow ? { id: String(simulationRow.id), query: String(simulationRow.query ?? ""), platform, probability: Number(simulationRow.probability ?? 0), confidence: Number(simulationRow.confidence ?? 0) } : null;
    return { entity, knowledge, products, cases, technicalDocuments, visibility, benchmark, simulation };
  },

  async latestEvaluation(userId: string, projectId: string) {
    const row = (await aiSearchDatabase().query('SELECT profile.* FROM "SimulationEvaluationProfile" profile INNER JOIN "Project" p ON p."id" = profile."projectId" WHERE profile."projectId" = $1 AND p."userId" = $2 ORDER BY profile."createdAt" DESC LIMIT 1', [projectId, userId]))[0];
    return row ? toProfile(row) : null;
  },

  async createEvaluation(userId: string, input: Omit<SimulationEvaluationProfile, "id" | "createdAt">) {
    const id = crypto.randomUUID();
    const row = (await aiSearchDatabase().query('INSERT INTO "SimulationEvaluationProfile" ("id", "projectId", "simulationResultId", "query", "platform", "industry", "intent", "targetEntity", "knowledgeVersion", "evaluationStatus", "healthScore", "recommendationProbability", "confidence", "signals", "issues", "methodVersion", "createdAt") SELECT $1, p."id", $3, $4, $5::"AISearchPlatform", $6, $7::"AISearchIntent", $8, $9, $10::"AISearchEvaluationStatus", $11, $12, $13, $14::jsonb, $15::jsonb, $16, $17 FROM "Project" p WHERE p."id" = $2 AND p."userId" = $18 RETURNING *', [id, input.projectId, input.simulationResultId, input.query, input.platform, input.industry, input.intent, input.targetEntity, input.knowledgeVersion, input.evaluationStatus, input.healthScore, input.recommendationProbability, input.confidence, JSON.stringify(input.signals), JSON.stringify(input.issues), input.methodVersion, new Date(), userId]))[0];
    return row ? toProfile(row) : null;
  },

  async syncOptimizationTasks(userId: string, projectId: string, issues: AIRecommendationIssue[]) {
    if (!issues.length) return [];
    const payload = issues.map((issue) => ({ id: crypto.randomUUID(), issueId: issue.optimizationIssueId, title: issueTitle(issue.type), description: issue.reason, recommendation: issue.recommendation, severity: issue.severity === "HIGH" ? "High" : issue.severity === "MEDIUM" ? "Medium" : "Low", category: "ai_recommendation" }));
    return aiSearchDatabase().query('WITH owned_project AS (SELECT p."id" FROM "Project" p WHERE p."id" = $1 AND p."userId" = $2), items AS (SELECT * FROM JSONB_TO_RECORDSET($3::jsonb) AS item("id" text, "issueId" text, "title" text, "description" text, "recommendation" text, "severity" text, "category" text)) INSERT INTO "OptimizationTask" ("id", "projectId", "issueId", "title", "description", "recommendation", "severity", "category", "status", "createdAt", "updatedAt") SELECT item."id", owned_project."id", item."issueId", item."title", item."description", item."recommendation", item."severity", item."category", \'PENDING\', $4, $4 FROM owned_project CROSS JOIN items ON CONFLICT ("projectId", "issueId") DO UPDATE SET "description" = EXCLUDED."description", "recommendation" = EXCLUDED."recommendation", "severity" = EXCLUDED."severity", "category" = EXCLUDED."category", "updatedAt" = EXCLUDED."updatedAt" RETURNING *', [projectId, userId, JSON.stringify(payload), new Date()]);
  },
};

function issueTitle(type: AIRecommendationIssue["type"]) { return ({ LOW_ENTITY_AUTHORITY: "提升企业实体可信度", INCOMPLETE_KNOWLEDGE: "完善企业 AI 知识画像", LOW_PRODUCT_CLARITY: "提高产品信息清晰度", INSUFFICIENT_PROOF: "补充客户证明", LOW_TECHNICAL_AUTHORITY: "增强技术权威证据", LOW_CITATION_POTENTIAL: "提升 AI 引用能力", COMPETITIVE_DISADVANTAGE: "缩小 AI 推荐竞争差距" } as const)[type]; }

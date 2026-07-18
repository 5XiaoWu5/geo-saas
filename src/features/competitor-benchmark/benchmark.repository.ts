import { competitorDatabase, isoDate, jsonRecord, nullableNumber, type DatabaseRow } from "./database";
import {
  BENCHMARK_RUN_STATUSES,
  BENCHMARK_TARGET_TYPES,
  type BenchmarkResult,
  type BenchmarkResultInput,
  type BenchmarkRun,
  type BenchmarkRunCreateInput,
  type BenchmarkRunStatus,
  type BenchmarkTargetType,
} from "./types";

export type BenchmarkAnalysisEvidenceRow = {
  id: string;
  totalScore: number;
  entityScore: number;
  schemaScore: number;
  createdAt: string;
};

export type BenchmarkCompetitorEvidenceRow = {
  competitorId: string;
  name: string;
  snapshotId: string | null;
  overallScore: number | null;
  visibilityScore: number | null;
  entityScore: number | null;
  schemaScore: number | null;
  authorityScore: number | null;
  citationScore: number | null;
  methodVersion: string | null;
  createdAt: string | null;
};

export type BenchmarkSimulationAggregateRow = {
  targetType: BenchmarkTargetType;
  competitorId: string | null;
  sampleCount: number;
  probability: number | null;
  confidence: number | null;
  entityScore: number | null;
  schemaScore: number | null;
  authorityScore: number | null;
  citationScore: number | null;
  sourceIds: string[];
};

export type BenchmarkVisibilityAggregateRow = {
  targetType: BenchmarkTargetType;
  competitorId: string | null;
  checkCount: number;
  mentionCount: number;
  averagePosition: number | null;
  citedCheckCount: number;
  sourceIds: string[];
};

export type BenchmarkEvidenceBundle = {
  analysis: BenchmarkAnalysisEvidenceRow | null;
  competitors: BenchmarkCompetitorEvidenceRow[];
  simulations: BenchmarkSimulationAggregateRow[];
  visibility: BenchmarkVisibilityAggregateRow[];
};

function runStatus(value: unknown): BenchmarkRunStatus {
  const status = String(value ?? "PENDING");
  return BENCHMARK_RUN_STATUSES.includes(status as BenchmarkRunStatus) ? status as BenchmarkRunStatus : "PENDING";
}

function targetType(value: unknown): BenchmarkTargetType {
  const target = String(value ?? "COMPETITOR");
  return BENCHMARK_TARGET_TYPES.includes(target as BenchmarkTargetType) ? target as BenchmarkTargetType : "COMPETITOR";
}

function optionalIsoDate(value: unknown) {
  return value === null || typeof value === "undefined" ? null : isoDate(value);
}

export function benchmarkTargetKey(type: BenchmarkTargetType, competitorId?: string | null) {
  if (type === "OWN") return "OWN";
  if (!competitorId) throw new Error("COMPETITOR_REQUIRED");
  return `COMPETITOR:${competitorId}`;
}

function validateOptionalScore(value: number | null | undefined) {
  return value === null || typeof value === "undefined" || (Number.isInteger(value) && value >= 0 && value <= 100);
}

function validateResultInput(input: BenchmarkResultInput) {
  if (!BENCHMARK_TARGET_TYPES.includes(input.targetType)) throw new Error("INVALID_BENCHMARK_RESULT");
  const scores = [input.overallScore, input.visibilityScore, input.entityScore, input.schemaScore, input.authorityScore, input.citationScore, input.simulationScore, input.coverage, input.confidence];
  if (scores.some((score) => !validateOptionalScore(score))) throw new Error("INVALID_BENCHMARK_RESULT");
  if (input.ranking !== null && typeof input.ranking !== "undefined" && (!Number.isInteger(input.ranking) || input.ranking < 1)) throw new Error("INVALID_BENCHMARK_RESULT");
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.map(String).filter(Boolean).sort() : [];
}

function averageNumber(value: unknown) {
  const number = nullableNumber(value);
  return number === null ? null : Math.round(number);
}

export function toBenchmarkRun(row: DatabaseRow): BenchmarkRun {
  return {
    id: String(row.id),
    projectId: String(row.projectId),
    campaignId: row.campaignId ? String(row.campaignId) : null,
    runKey: String(row.runKey ?? ""),
    scopeHash: String(row.scopeHash ?? ""),
    provider: String(row.provider ?? ""),
    methodVersion: String(row.methodVersion ?? ""),
    windowStart: optionalIsoDate(row.windowStart),
    windowEnd: optionalIsoDate(row.windowEnd),
    queryCount: Number(row.queryCount ?? 0),
    status: runStatus(row.status),
    completedAt: optionalIsoDate(row.completedAt),
    createdAt: isoDate(row.createdAt),
    updatedAt: isoDate(row.updatedAt),
  };
}

export function toBenchmarkResult(row: DatabaseRow): BenchmarkResult {
  return {
    id: String(row.id),
    benchmarkRunId: String(row.benchmarkRunId),
    targetType: targetType(row.targetType),
    targetKey: String(row.targetKey ?? ""),
    competitorId: row.competitorId ? String(row.competitorId) : null,
    overallScore: nullableNumber(row.overallScore),
    visibilityScore: nullableNumber(row.visibilityScore),
    entityScore: nullableNumber(row.entityScore),
    schemaScore: nullableNumber(row.schemaScore),
    authorityScore: nullableNumber(row.authorityScore),
    citationScore: nullableNumber(row.citationScore),
    simulationScore: nullableNumber(row.simulationScore),
    difference: nullableNumber(row.difference),
    ranking: nullableNumber(row.ranking),
    coverage: nullableNumber(row.coverage),
    confidence: nullableNumber(row.confidence),
    scoreBasis: row.scoreBasis ? String(row.scoreBasis) : null,
    metadata: jsonRecord(row.metadata),
    createdAt: isoDate(row.createdAt),
  };
}

export const benchmarkRepository = {
  async listRunsForProject(userId: string, projectId: string, limit = 100) {
    const safeLimit = Math.max(1, Math.min(500, limit));
    const rows = await competitorDatabase().query('SELECT br.* FROM "BenchmarkRun" br INNER JOIN "Project" p ON p."id" = br."projectId" WHERE br."projectId" = $1 AND p."userId" = $2 ORDER BY br."createdAt" DESC LIMIT $3', [projectId, userId, safeLimit]);
    return rows.map(toBenchmarkRun);
  },

  async findRunForUser(userId: string, benchmarkRunId: string) {
    const row = (await competitorDatabase().query('SELECT br.* FROM "BenchmarkRun" br INNER JOIN "Project" p ON p."id" = br."projectId" WHERE br."id" = $1 AND p."userId" = $2 LIMIT 1', [benchmarkRunId, userId]))[0];
    return row ? toBenchmarkRun(row) : null;
  },

  async latestCompletedRunForProject(userId: string, projectId: string, provider?: string | null) {
    const row = provider
      ? (await competitorDatabase().query('SELECT br.* FROM "BenchmarkRun" br INNER JOIN "Project" p ON p."id" = br."projectId" WHERE br."projectId" = $1 AND p."userId" = $2 AND br."provider" = $3 AND br."status" = \'COMPLETED\' ORDER BY br."createdAt" DESC LIMIT 1', [projectId, userId, provider]))[0]
      : (await competitorDatabase().query('SELECT br.* FROM "BenchmarkRun" br INNER JOIN "Project" p ON p."id" = br."projectId" WHERE br."projectId" = $1 AND p."userId" = $2 AND br."status" = \'COMPLETED\' ORDER BY br."createdAt" DESC LIMIT 1', [projectId, userId]))[0];
    return row ? toBenchmarkRun(row) : null;
  },

  async resultsForRun(userId: string, benchmarkRunId: string) {
    const rows = await competitorDatabase().query('SELECT result.* FROM "BenchmarkResult" result INNER JOIN "BenchmarkRun" br ON br."id" = result."benchmarkRunId" INNER JOIN "Project" p ON p."id" = br."projectId" WHERE result."benchmarkRunId" = $1 AND p."userId" = $2 ORDER BY result."ranking" ASC NULLS LAST, result."targetType" ASC, result."createdAt" ASC', [benchmarkRunId, userId]);
    return rows.map(toBenchmarkResult);
  },

  async loadEvidenceForRun(userId: string, run: BenchmarkRun): Promise<BenchmarkEvidenceBundle> {
    const windowStart = run.windowStart ? new Date(run.windowStart) : null;
    const windowEnd = run.windowEnd ? new Date(run.windowEnd) : null;
    const [analysisRows, competitorRows, simulationRows, visibilityRows] = await Promise.all([
      competitorDatabase().query('SELECT ga."id", ga."totalScore", ga."entityScore", ga."schemaScore", ga."createdAt" FROM "GeoAnalysis" ga INNER JOIN "Project" p ON p."id" = ga."projectId" WHERE ga."projectId" = $1 AND p."userId" = $2 AND ($3::timestamptz IS NULL OR ga."createdAt" <= $3) ORDER BY ga."createdAt" DESC LIMIT 1', [run.projectId, userId, windowEnd]),
      competitorDatabase().query('SELECT DISTINCT ON (cp."id") cp."id" AS "competitorId", cp."name", cs."id" AS "snapshotId", cs."overallScore", cs."visibilityScore", cs."entityScore", cs."schemaScore", cs."authorityScore", cs."citationScore", cs."methodVersion", cs."createdAt" FROM "CompetitorProfile" cp INNER JOIN "Project" p ON p."id" = cp."projectId" LEFT JOIN "CompetitorSnapshot" cs ON cs."competitorId" = cp."id" AND ($3::timestamptz IS NULL OR cs."createdAt" <= $3) WHERE cp."projectId" = $1 AND p."userId" = $2 AND cp."status" = \'ACTIVE\' ORDER BY cp."id", cs."createdAt" DESC NULLS LAST', [run.projectId, userId, windowEnd]),
      competitorDatabase().query('SELECT st."targetType"::text AS "targetType", st."competitorId", COUNT(sr."id")::int AS "sampleCount", AVG(sr."probability") AS "probability", AVG(sr."confidence") AS "confidence", AVG(sr."entityScore") AS "entityScore", AVG(sr."schemaScore") AS "schemaScore", AVG(sr."authorityScore") AS "authorityScore", AVG(sr."citationScore") AS "citationScore", (ARRAY_AGG(sr."id" ORDER BY sr."id"))[1:20] AS "sourceIds" FROM "SimulationTask" st INNER JOIN "SimulationResult" sr ON sr."taskId" = st."id" INNER JOIN "Project" p ON p."id" = st."projectId" LEFT JOIN "CompetitorProfile" cp ON cp."id" = st."competitorId" WHERE st."projectId" = $1 AND p."userId" = $2 AND ($3 = \'ALL\' OR st."provider" = $3) AND ($4::text IS NULL OR st."campaignId" = $4) AND ($5::timestamptz IS NULL OR sr."createdAt" >= $5) AND ($6::timestamptz IS NULL OR sr."createdAt" <= $6) AND ((st."targetType" = \'OWN\' AND st."competitorId" IS NULL) OR (st."targetType" = \'COMPETITOR\' AND cp."projectId" = st."projectId")) GROUP BY st."targetType", st."competitorId"', [run.projectId, userId, run.provider, run.campaignId, windowStart, windowEnd]),
      competitorDatabase().query('WITH filtered_checks AS (SELECT vc.* FROM "VisibilityCheck" vc INNER JOIN "VisibilityCampaign" campaign ON campaign."id" = vc."campaignId" INNER JOIN "Project" p ON p."id" = campaign."projectId" WHERE campaign."projectId" = $1 AND p."userId" = $2 AND ($3 = \'ALL\' OR vc."provider" = $3) AND ($4::timestamptz IS NULL OR vc."createdAt" >= $4) AND ($5::timestamptz IS NULL OR vc."createdAt" <= $5)), own_evidence AS (SELECT \'OWN\'::text AS "targetType", NULL::text AS "competitorId", COUNT(DISTINCT fc."id")::int AS "checkCount", COUNT(DISTINCT fc."id") FILTER (WHERE fc."brandMentioned")::int AS "mentionCount", AVG(fc."mentionPosition") FILTER (WHERE fc."brandMentioned") AS "averagePosition", COUNT(DISTINCT fc."id") FILTER (WHERE CARDINALITY(fc."sourceUrls") > 0 OR citation."id" IS NOT NULL)::int AS "citedCheckCount", (COALESCE(ARRAY_AGG(DISTINCT fc."id" ORDER BY fc."id") FILTER (WHERE fc."id" IS NOT NULL), ARRAY[]::text[]))[1:20] AS "sourceIds" FROM filtered_checks fc LEFT JOIN "VisibilityCitation" citation ON citation."checkId" = fc."id"), competitor_evidence AS (SELECT \'COMPETITOR\'::text AS "targetType", cp."id" AS "competitorId", COUNT(DISTINCT fc."id")::int AS "checkCount", COUNT(DISTINCT fc."id") FILTER (WHERE mention."id" IS NOT NULL)::int AS "mentionCount", AVG(mention."position") FILTER (WHERE mention."id" IS NOT NULL) AS "averagePosition", COUNT(DISTINCT fc."id") FILTER (WHERE citation."id" IS NOT NULL)::int AS "citedCheckCount", (COALESCE(ARRAY_AGG(DISTINCT fc."id" ORDER BY fc."id") FILTER (WHERE fc."id" IS NOT NULL), ARRAY[]::text[]))[1:20] AS "sourceIds" FROM "CompetitorProfile" cp INNER JOIN "Project" p ON p."id" = cp."projectId" LEFT JOIN filtered_checks fc ON TRUE LEFT JOIN "VisibilityMention" mention ON mention."checkId" = fc."id" AND mention."competitorId" = cp."id" LEFT JOIN "VisibilityCitation" citation ON citation."checkId" = fc."id" AND citation."mentionId" = mention."id" WHERE cp."projectId" = $1 AND p."userId" = $2 AND cp."status" = \'ACTIVE\' GROUP BY cp."id") SELECT * FROM own_evidence UNION ALL SELECT * FROM competitor_evidence', [run.projectId, userId, run.provider, windowStart, windowEnd]),
    ]);

    const analysis = analysisRows[0] ? {
      id: String(analysisRows[0].id),
      totalScore: Number(analysisRows[0].totalScore),
      entityScore: Number(analysisRows[0].entityScore),
      schemaScore: Number(analysisRows[0].schemaScore),
      createdAt: isoDate(analysisRows[0].createdAt),
    } : null;
    const competitors = competitorRows.map<BenchmarkCompetitorEvidenceRow>((row) => ({
      competitorId: String(row.competitorId),
      name: String(row.name ?? ""),
      snapshotId: row.snapshotId ? String(row.snapshotId) : null,
      overallScore: nullableNumber(row.overallScore),
      visibilityScore: nullableNumber(row.visibilityScore),
      entityScore: nullableNumber(row.entityScore),
      schemaScore: nullableNumber(row.schemaScore),
      authorityScore: nullableNumber(row.authorityScore),
      citationScore: nullableNumber(row.citationScore),
      methodVersion: row.methodVersion ? String(row.methodVersion) : null,
      createdAt: row.createdAt ? isoDate(row.createdAt) : null,
    }));
    const simulations = simulationRows.map<BenchmarkSimulationAggregateRow>((row) => ({
      targetType: targetType(row.targetType),
      competitorId: row.competitorId ? String(row.competitorId) : null,
      sampleCount: Number(row.sampleCount ?? 0),
      probability: averageNumber(row.probability),
      confidence: averageNumber(row.confidence),
      entityScore: averageNumber(row.entityScore),
      schemaScore: averageNumber(row.schemaScore),
      authorityScore: averageNumber(row.authorityScore),
      citationScore: averageNumber(row.citationScore),
      sourceIds: stringArray(row.sourceIds),
    }));
    const visibility = visibilityRows.map<BenchmarkVisibilityAggregateRow>((row) => ({
      targetType: targetType(row.targetType),
      competitorId: row.competitorId ? String(row.competitorId) : null,
      checkCount: Number(row.checkCount ?? 0),
      mentionCount: Number(row.mentionCount ?? 0),
      averagePosition: nullableNumber(row.averagePosition),
      citedCheckCount: Number(row.citedCheckCount ?? 0),
      sourceIds: stringArray(row.sourceIds),
    }));
    return { analysis, competitors, simulations, visibility };
  },

  async createRunForUser(userId: string, input: BenchmarkRunCreateInput) {
    if (!input.runKey.trim() || !input.scopeHash.trim() || !input.provider.trim() || !input.methodVersion.trim() || !Number.isInteger(input.queryCount) || input.queryCount < 0) throw new Error("INVALID_BENCHMARK_RUN");
    if (input.windowStart && input.windowEnd && input.windowStart > input.windowEnd) throw new Error("INVALID_BENCHMARK_RUN");
    const now = new Date();
    const row = (await competitorDatabase().query('INSERT INTO "BenchmarkRun" ("id", "projectId", "campaignId", "runKey", "scopeHash", "provider", "methodVersion", "windowStart", "windowEnd", "queryCount", "status", "createdAt", "updatedAt") SELECT $1, p."id", $3, $4, $5, $6, $7, $8, $9, $10, \'PENDING\', $11, $11 FROM "Project" p WHERE p."id" = $2 AND p."userId" = $12 AND ($3::text IS NULL OR EXISTS (SELECT 1 FROM "GeoCampaign" campaign WHERE campaign."id" = $3 AND campaign."projectId" = p."id")) ON CONFLICT ("projectId", "runKey") DO NOTHING RETURNING *', [
      crypto.randomUUID(),
      input.projectId,
      input.campaignId ?? null,
      input.runKey,
      input.scopeHash,
      input.provider,
      input.methodVersion,
      input.windowStart ?? null,
      input.windowEnd ?? null,
      input.queryCount,
      now,
      userId,
    ]))[0];
    if (row) return toBenchmarkRun(row);
    const existing = (await competitorDatabase().query('SELECT br.* FROM "BenchmarkRun" br INNER JOIN "Project" p ON p."id" = br."projectId" WHERE br."projectId" = $1 AND br."runKey" = $2 AND p."userId" = $3 LIMIT 1', [input.projectId, input.runKey, userId]))[0];
    return existing ? toBenchmarkRun(existing) : null;
  },

  async updateRunStatusForUser(userId: string, benchmarkRunId: string, status: BenchmarkRunStatus) {
    const completedAt = status === "COMPLETED" || status === "FAILED" ? new Date() : null;
    const row = (await competitorDatabase().query('UPDATE "BenchmarkRun" br SET "status" = $1::"BenchmarkRunStatus", "completedAt" = $2, "updatedAt" = $3 FROM "Project" p WHERE br."id" = $4 AND br."projectId" = p."id" AND p."userId" = $5 RETURNING br.*', [status, completedAt, new Date(), benchmarkRunId, userId]))[0];
    return row ? toBenchmarkRun(row) : null;
  },

  async upsertResultForUser(userId: string, input: BenchmarkResultInput) {
    const rows = await this.upsertResultsForUser(userId, input.benchmarkRunId, [input]);
    return rows[0] ?? null;
  },

  async upsertResultsForUser(userId: string, benchmarkRunId: string, inputs: BenchmarkResultInput[]) {
    if (!inputs.length) return [];
    const targetKeys = new Set<string>();
    const payload = inputs.map((input) => {
      validateResultInput(input);
      if (input.benchmarkRunId !== benchmarkRunId) throw new Error("BENCHMARK_RUN_MISMATCH");
      const key = benchmarkTargetKey(input.targetType, input.competitorId);
      if (targetKeys.has(key)) throw new Error("DUPLICATE_BENCHMARK_TARGET");
      targetKeys.add(key);
      return {
        id: crypto.randomUUID(),
        targetType: input.targetType,
        targetKey: key,
        competitorId: input.competitorId ?? null,
        overallScore: input.overallScore ?? null,
        visibilityScore: input.visibilityScore ?? null,
        entityScore: input.entityScore ?? null,
        schemaScore: input.schemaScore ?? null,
        authorityScore: input.authorityScore ?? null,
        citationScore: input.citationScore ?? null,
        simulationScore: input.simulationScore ?? null,
        difference: input.difference ?? null,
        ranking: input.ranking ?? null,
        coverage: input.coverage ?? null,
        confidence: input.confidence ?? null,
        scoreBasis: input.scoreBasis ?? null,
        metadata: input.metadata ?? {},
      };
    });
    const rows = await competitorDatabase().query('WITH authorized_run AS (SELECT br."id", br."projectId" FROM "BenchmarkRun" br INNER JOIN "Project" p ON p."id" = br."projectId" WHERE br."id" = $1 AND p."userId" = $3), input_rows AS (SELECT * FROM JSONB_TO_RECORDSET($2::jsonb) AS item("id" text, "targetType" text, "targetKey" text, "competitorId" text, "overallScore" int, "visibilityScore" int, "entityScore" int, "schemaScore" int, "authorityScore" int, "citationScore" int, "simulationScore" int, "difference" int, "ranking" int, "coverage" int, "confidence" int, "scoreBasis" text, "metadata" jsonb)) INSERT INTO "BenchmarkResult" ("id", "benchmarkRunId", "targetType", "targetKey", "competitorId", "overallScore", "visibilityScore", "entityScore", "schemaScore", "authorityScore", "citationScore", "simulationScore", "difference", "ranking", "coverage", "confidence", "scoreBasis", "metadata", "createdAt") SELECT item."id", run."id", item."targetType"::"BenchmarkTargetType", item."targetKey", item."competitorId", item."overallScore", item."visibilityScore", item."entityScore", item."schemaScore", item."authorityScore", item."citationScore", item."simulationScore", item."difference", item."ranking", item."coverage", item."confidence", item."scoreBasis", item."metadata", NOW() FROM input_rows item CROSS JOIN authorized_run run LEFT JOIN "CompetitorProfile" cp ON cp."id" = item."competitorId" WHERE (item."targetType" = \'OWN\' AND item."competitorId" IS NULL AND item."targetKey" = \'OWN\') OR (item."targetType" = \'COMPETITOR\' AND cp."id" IS NOT NULL AND cp."projectId" = run."projectId" AND item."targetKey" = \'COMPETITOR:\' || cp."id") ON CONFLICT ("benchmarkRunId", "targetKey") DO UPDATE SET "overallScore" = EXCLUDED."overallScore", "visibilityScore" = EXCLUDED."visibilityScore", "entityScore" = EXCLUDED."entityScore", "schemaScore" = EXCLUDED."schemaScore", "authorityScore" = EXCLUDED."authorityScore", "citationScore" = EXCLUDED."citationScore", "simulationScore" = EXCLUDED."simulationScore", "difference" = EXCLUDED."difference", "ranking" = EXCLUDED."ranking", "coverage" = EXCLUDED."coverage", "confidence" = EXCLUDED."confidence", "scoreBasis" = EXCLUDED."scoreBasis", "metadata" = EXCLUDED."metadata" RETURNING *', [benchmarkRunId, JSON.stringify(payload), userId]);
    if (rows.length !== inputs.length) throw new Error("BENCHMARK_RESULT_FORBIDDEN");
    return rows.map(toBenchmarkResult).sort((left, right) => left.targetKey.localeCompare(right.targetKey, "en-US"));
  },

  async deleteResultsOutsideTargetsForUser(userId: string, benchmarkRunId: string, targetKeys: string[]) {
    const rows = await competitorDatabase().query('DELETE FROM "BenchmarkResult" result USING "BenchmarkRun" br, "Project" p WHERE result."benchmarkRunId" = br."id" AND br."projectId" = p."id" AND br."id" = $1 AND p."userId" = $2 AND NOT (result."targetKey" = ANY($3::text[])) RETURNING result."id"', [benchmarkRunId, userId, targetKeys]);
    return rows.length;
  },
};

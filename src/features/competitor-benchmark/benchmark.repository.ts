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
  const scores = [input.overallScore, input.visibilityScore, input.entityScore, input.schemaScore, input.authorityScore, input.citationScore, input.simulationScore, input.coverage, input.confidence];
  if (scores.some((score) => !validateOptionalScore(score))) throw new Error("INVALID_BENCHMARK_RESULT");
  if (input.ranking !== null && typeof input.ranking !== "undefined" && (!Number.isInteger(input.ranking) || input.ranking < 1)) throw new Error("INVALID_BENCHMARK_RESULT");
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
    validateResultInput(input);
    const key = benchmarkTargetKey(input.targetType, input.competitorId);
    const row = (await competitorDatabase().query('INSERT INTO "BenchmarkResult" ("id", "benchmarkRunId", "targetType", "targetKey", "competitorId", "overallScore", "visibilityScore", "entityScore", "schemaScore", "authorityScore", "citationScore", "simulationScore", "difference", "ranking", "coverage", "confidence", "scoreBasis", "metadata", "createdAt") SELECT $1, br."id", $3::"BenchmarkTargetType", $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18::jsonb, $19 FROM "BenchmarkRun" br INNER JOIN "Project" p ON p."id" = br."projectId" LEFT JOIN "CompetitorProfile" cp ON cp."id" = $5 WHERE br."id" = $2 AND p."userId" = $20 AND (($3 = \'OWN\' AND $5::text IS NULL) OR ($3 = \'COMPETITOR\' AND cp."id" IS NOT NULL AND cp."projectId" = br."projectId")) ON CONFLICT ("benchmarkRunId", "targetKey") DO UPDATE SET "overallScore" = EXCLUDED."overallScore", "visibilityScore" = EXCLUDED."visibilityScore", "entityScore" = EXCLUDED."entityScore", "schemaScore" = EXCLUDED."schemaScore", "authorityScore" = EXCLUDED."authorityScore", "citationScore" = EXCLUDED."citationScore", "simulationScore" = EXCLUDED."simulationScore", "difference" = EXCLUDED."difference", "ranking" = EXCLUDED."ranking", "coverage" = EXCLUDED."coverage", "confidence" = EXCLUDED."confidence", "scoreBasis" = EXCLUDED."scoreBasis", "metadata" = EXCLUDED."metadata" RETURNING *', [
      crypto.randomUUID(),
      input.benchmarkRunId,
      input.targetType,
      key,
      input.competitorId ?? null,
      input.overallScore ?? null,
      input.visibilityScore ?? null,
      input.entityScore ?? null,
      input.schemaScore ?? null,
      input.authorityScore ?? null,
      input.citationScore ?? null,
      input.simulationScore ?? null,
      input.difference ?? null,
      input.ranking ?? null,
      input.coverage ?? null,
      input.confidence ?? null,
      input.scoreBasis ?? null,
      JSON.stringify(input.metadata ?? {}),
      new Date(),
      userId,
    ]))[0];
    return row ? toBenchmarkResult(row) : null;
  },
};

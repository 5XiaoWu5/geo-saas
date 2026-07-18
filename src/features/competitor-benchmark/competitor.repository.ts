import { competitorDatabase, isoDate, jsonRecord, nullableNumber, type DatabaseRow } from "./database";
import { COMPETITOR_STATUSES, type CompetitorProfile, type CompetitorSnapshot, type CompetitorSnapshotInput, type CompetitorStatus } from "./types";

function competitorStatus(value: unknown): CompetitorStatus {
  const status = String(value ?? "ACTIVE");
  return COMPETITOR_STATUSES.includes(status as CompetitorStatus) ? status as CompetitorStatus : "ACTIVE";
}

export function toCompetitorProfile(row: DatabaseRow): CompetitorProfile {
  return {
    id: String(row.id),
    projectId: String(row.projectId),
    name: String(row.name ?? ""),
    domain: String(row.domain ?? ""),
    normalizedDomain: String(row.normalizedDomain ?? ""),
    industry: String(row.industry ?? ""),
    region: String(row.region ?? ""),
    status: competitorStatus(row.status),
    metadata: jsonRecord(row.metadata),
    createdAt: isoDate(row.createdAt),
    updatedAt: isoDate(row.updatedAt),
  };
}

export function toCompetitorSnapshot(row: DatabaseRow): CompetitorSnapshot {
  return {
    id: String(row.id),
    competitorId: String(row.competitorId),
    overallScore: nullableNumber(row.overallScore),
    visibilityScore: nullableNumber(row.visibilityScore),
    entityScore: nullableNumber(row.entityScore),
    schemaScore: nullableNumber(row.schemaScore),
    authorityScore: nullableNumber(row.authorityScore),
    citationScore: nullableNumber(row.citationScore),
    methodVersion: String(row.methodVersion ?? ""),
    sourceId: String(row.sourceId ?? ""),
    metadata: jsonRecord(row.metadata),
    createdAt: isoDate(row.createdAt),
  };
}

export function isUniqueConstraintError(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && (error as { code?: unknown }).code === "23505");
}

export const competitorRepository = {
  async projectOwned(userId: string, projectId: string) {
    const rows = await competitorDatabase().query('SELECT "id" FROM "Project" WHERE "id" = $1 AND "userId" = $2 LIMIT 1', [projectId, userId]);
    return Boolean(rows[0]);
  },

  async projectIdentity(userId: string, projectId: string) {
    return (await competitorDatabase().query('SELECT "id", "name", "domain", "industry", "country" FROM "Project" WHERE "id" = $1 AND "userId" = $2 LIMIT 1', [projectId, userId]))[0] ?? null;
  },

  async listForProject(userId: string, projectId: string) {
    const rows = await competitorDatabase().query('SELECT cp.* FROM "CompetitorProfile" cp INNER JOIN "Project" p ON p."id" = cp."projectId" WHERE cp."projectId" = $1 AND p."userId" = $2 ORDER BY cp."createdAt" DESC', [projectId, userId]);
    return rows.map(toCompetitorProfile);
  },

  async findByIdForUser(userId: string, competitorId: string) {
    const row = (await competitorDatabase().query('SELECT cp.* FROM "CompetitorProfile" cp INNER JOIN "Project" p ON p."id" = cp."projectId" WHERE cp."id" = $1 AND p."userId" = $2 LIMIT 1', [competitorId, userId]))[0];
    return row ? toCompetitorProfile(row) : null;
  },

  async createForUser(userId: string, data: Omit<CompetitorProfile, "createdAt" | "updatedAt">) {
    const now = new Date();
    const row = (await competitorDatabase().query('INSERT INTO "CompetitorProfile" ("id", "projectId", "name", "domain", "normalizedDomain", "industry", "region", "status", "metadata", "createdAt", "updatedAt") SELECT $1, p."id", $3, $4, $5, $6, $7, $8::"CompetitorStatus", $9::jsonb, $10, $10 FROM "Project" p WHERE p."id" = $2 AND p."userId" = $11 RETURNING *', [
      data.id,
      data.projectId,
      data.name,
      data.domain,
      data.normalizedDomain,
      data.industry,
      data.region,
      data.status,
      JSON.stringify(data.metadata),
      now,
      userId,
    ]))[0];
    return row ? toCompetitorProfile(row) : null;
  },

  async updateForUser(userId: string, data: Omit<CompetitorProfile, "createdAt" | "updatedAt">) {
    const row = (await competitorDatabase().query('UPDATE "CompetitorProfile" cp SET "name" = $1, "domain" = $2, "normalizedDomain" = $3, "industry" = $4, "region" = $5, "status" = $6::"CompetitorStatus", "metadata" = $7::jsonb, "updatedAt" = $8 FROM "Project" p WHERE cp."id" = $9 AND cp."projectId" = p."id" AND p."userId" = $10 RETURNING cp.*', [
      data.name,
      data.domain,
      data.normalizedDomain,
      data.industry,
      data.region,
      data.status,
      JSON.stringify(data.metadata),
      new Date(),
      data.id,
      userId,
    ]))[0];
    return row ? toCompetitorProfile(row) : null;
  },

  async deleteForUser(userId: string, competitorId: string) {
    const rows = await competitorDatabase().query('DELETE FROM "CompetitorProfile" cp USING "Project" p WHERE cp."id" = $1 AND cp."projectId" = p."id" AND p."userId" = $2 RETURNING cp."id"', [competitorId, userId]);
    return Boolean(rows[0]);
  },

  async latestSnapshotForUser(userId: string, competitorId: string) {
    const row = (await competitorDatabase().query('SELECT cs.* FROM "CompetitorSnapshot" cs INNER JOIN "CompetitorProfile" cp ON cp."id" = cs."competitorId" INNER JOIN "Project" p ON p."id" = cp."projectId" WHERE cs."competitorId" = $1 AND p."userId" = $2 ORDER BY cs."createdAt" DESC LIMIT 1', [competitorId, userId]))[0];
    return row ? toCompetitorSnapshot(row) : null;
  },

  async latestSnapshotsForProject(userId: string, projectId: string) {
    const rows = await competitorDatabase().query('SELECT DISTINCT ON (cp."id") cs.* FROM "CompetitorProfile" cp INNER JOIN "Project" p ON p."id" = cp."projectId" LEFT JOIN "CompetitorSnapshot" cs ON cs."competitorId" = cp."id" WHERE cp."projectId" = $1 AND p."userId" = $2 AND cs."id" IS NOT NULL ORDER BY cp."id", cs."createdAt" DESC', [projectId, userId]);
    return rows.map(toCompetitorSnapshot);
  },

  async saveSnapshotForUser(userId: string, input: CompetitorSnapshotInput) {
    const row = (await competitorDatabase().query('INSERT INTO "CompetitorSnapshot" ("id", "competitorId", "overallScore", "visibilityScore", "entityScore", "schemaScore", "authorityScore", "citationScore", "methodVersion", "sourceId", "metadata", "createdAt") SELECT $1, cp."id", $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13 FROM "CompetitorProfile" cp INNER JOIN "Project" p ON p."id" = cp."projectId" WHERE cp."id" = $2 AND cp."projectId" = $3 AND p."userId" = $14 ON CONFLICT ("competitorId", "methodVersion", "sourceId") DO UPDATE SET "overallScore" = EXCLUDED."overallScore", "visibilityScore" = EXCLUDED."visibilityScore", "entityScore" = EXCLUDED."entityScore", "schemaScore" = EXCLUDED."schemaScore", "authorityScore" = EXCLUDED."authorityScore", "citationScore" = EXCLUDED."citationScore", "metadata" = EXCLUDED."metadata" RETURNING *', [
      crypto.randomUUID(),
      input.competitorId,
      input.projectId,
      input.overallScore ?? null,
      input.visibilityScore ?? null,
      input.entityScore ?? null,
      input.schemaScore ?? null,
      input.authorityScore ?? null,
      input.citationScore ?? null,
      input.methodVersion,
      input.sourceId,
      JSON.stringify(input.metadata ?? {}),
      new Date(),
      userId,
    ]))[0];
    return row ? toCompetitorSnapshot(row) : null;
  },

  async ownEntityProfile(userId: string, projectId: string) {
    return (await competitorDatabase().query('SELECT ep.* FROM "EntityProfile" ep INNER JOIN "Project" p ON p."id" = ep."projectId" WHERE ep."projectId" = $1 AND p."userId" = $2 ORDER BY ep."updatedAt" DESC LIMIT 1', [projectId, userId]))[0] ?? null;
  },
};

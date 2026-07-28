import { iso, realAISearchDatabase, type Row } from "./database";
import type {
  AISearchDetectionSource,
  AISearchIntent,
  AISearchProviderType,
  AISearchQueryView,
} from "./types";

function queryView(row: Row): AISearchQueryView {
  return {
    id: String(row.id),
    query: String(row.query),
    intent: String(row.intent) as AISearchIntent,
    archivedAt: row.archivedAt ? iso(row.archivedAt) : null,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    resultCount: Number(row.resultCount ?? 0),
    succeededCount: Number(row.succeededCount ?? 0),
    failedCount: Number(row.failedCount ?? 0),
    latestResultStatus: row.latestResultStatus
      ? String(row.latestResultStatus) as AISearchQueryView["latestResultStatus"]
      : null,
    lastAttemptedAt: row.lastAttemptedAt ? iso(row.lastAttemptedAt) : null,
  };
}

const QUERY_SELECT = `
  SELECT query.*,
    COUNT(result."id")::int AS "resultCount",
    COUNT(result."id") FILTER (WHERE result."status" = 'SUCCEEDED')::int AS "succeededCount",
    COUNT(result."id") FILTER (WHERE result."status" = 'FAILED')::int AS "failedCount",
    (
      SELECT latest."status"
      FROM "AISearchResult" latest
      WHERE latest."queryId" = query."id"
      ORDER BY latest."createdAt" DESC
      LIMIT 1
    ) AS "latestResultStatus",
    MAX(result."createdAt") AS "lastAttemptedAt"
  FROM "AISearchQuery" query
  INNER JOIN "Project" project ON project."id" = query."projectId"
  LEFT JOIN "AISearchResult" result ON result."queryId" = query."id"
`;

export const aiSearchQueryRepository = {
  async list(userId: string, projectId: string, includeArchived = false) {
    const rows = await realAISearchDatabase().query(
      `${QUERY_SELECT}
       WHERE query."projectId" = $1
         AND project."userId" = $2
         AND ($3::boolean OR query."archivedAt" IS NULL)
       GROUP BY query."id"
       ORDER BY query."archivedAt" NULLS FIRST, query."createdAt" ASC`,
      [projectId, userId, includeArchived],
    );
    return rows.map(queryView);
  },

  async upsert(
    userId: string,
    projectId: string,
    input: { query: string; intent: AISearchIntent },
  ) {
    const rows = await realAISearchDatabase().query(
      `WITH owned AS (
         SELECT project."id", project."name", project."industry",
           COALESCE((
             SELECT entity."brandName"
             FROM "EntityProfile" entity
             WHERE entity."projectId" = project."id"
             ORDER BY entity."updatedAt" DESC
             LIMIT 1
           ), project."name") AS "targetEntity"
         FROM "Project" project
         WHERE project."id" = $1 AND project."userId" = $2
       )
       INSERT INTO "AISearchQuery" (
         "id", "projectId", "monitorId", "query", "normalizedQuery",
         "targetEntity", "industry", "intent", "archivedAt", "createdAt", "updatedAt"
       )
       SELECT
         $5, owned."id", NULL, btrim($3), "normalize_ai_search_query"($3),
         owned."targetEntity", owned."industry", $4::"AISearchIntent", NULL, $6, $6
       FROM owned
       ON CONFLICT ("projectId", "normalizedQuery")
       DO UPDATE SET
         "archivedAt" = NULL,
         "updatedAt" = EXCLUDED."updatedAt"
       RETURNING *`,
      [projectId, userId, input.query, input.intent, crypto.randomUUID(), new Date()],
    );
    return rows[0] ?? null;
  },

  async owned(userId: string, projectId: string, queryId: string) {
    return (await realAISearchDatabase().query(
      `SELECT query.*
       FROM "AISearchQuery" query
       INNER JOIN "Project" project ON project."id" = query."projectId"
       WHERE query."id" = $3
         AND query."projectId" = $1
         AND project."userId" = $2
         AND query."archivedAt" IS NULL
       LIMIT 1`,
      [projectId, userId, queryId],
    ))[0] ?? null;
  },

  async archive(userId: string, projectId: string, queryId: string) {
    return (await realAISearchDatabase().query(
      `UPDATE "AISearchQuery" query
       SET "archivedAt" = $4, "updatedAt" = $4
       FROM "Project" project
       WHERE query."id" = $3
         AND query."projectId" = $1
         AND project."id" = query."projectId"
         AND project."userId" = $2
       RETURNING query."id"`,
      [projectId, userId, queryId, new Date()],
    )).length > 0;
  },

  async createResult(
    userId: string,
    input: {
      projectId: string;
      queryId: string;
      provider: AISearchProviderType;
      detectionSource: AISearchDetectionSource;
    },
  ) {
    const now = new Date();
    const resultId = crypto.randomUUID();
    const monitorId = crypto.randomUUID();
    const rows = await realAISearchDatabase().query(
      `WITH owned_query AS (
         SELECT query.*
         FROM "AISearchQuery" query
         INNER JOIN "Project" project ON project."id" = query."projectId"
         WHERE query."id" = $3
           AND query."projectId" = $1
           AND project."userId" = $2
           AND query."archivedAt" IS NULL
       ),
       existing_monitor AS (
         SELECT monitor."id"
         FROM "AISearchMonitor" monitor
         INNER JOIN owned_query ON owned_query."projectId" = monitor."projectId"
         WHERE monitor."enabled" = true
         ORDER BY monitor."createdAt"
         LIMIT 1
       ),
       inserted_monitor AS (
         INSERT INTO "AISearchMonitor" ("id", "projectId", "name", "enabled", "createdAt", "updatedAt")
         SELECT $7, owned_query."projectId", 'AI Search Monitor', true, $6, $6
         FROM owned_query
         WHERE NOT EXISTS (SELECT 1 FROM existing_monitor)
         RETURNING "id"
       ),
       selected_monitor AS (
         SELECT "id" FROM existing_monitor
         UNION ALL
         SELECT "id" FROM inserted_monitor
         LIMIT 1
       ),
       linked_query AS (
         UPDATE "AISearchQuery" query
         SET "monitorId" = selected_monitor."id", "updatedAt" = $6
         FROM selected_monitor
         WHERE query."id" = $3
         RETURNING query.*
       )
       INSERT INTO "AISearchResult" (
         "id", "projectId", "queryId", "provider", "detectionSource", "status", "createdAt"
       )
       SELECT $8, linked_query."projectId", linked_query."id", $4::"AISearchProviderType",
         $5::"AISearchDetectionSource", 'PENDING', $6
       FROM linked_query
       RETURNING *`,
      [
        input.projectId,
        userId,
        input.queryId,
        input.provider,
        input.detectionSource,
        now,
        monitorId,
        resultId,
      ],
    );
    return rows[0] ? { resultId, queryId: input.queryId } : null;
  },
};

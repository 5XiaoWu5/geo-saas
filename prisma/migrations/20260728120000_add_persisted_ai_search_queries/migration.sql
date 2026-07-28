BEGIN;

CREATE OR REPLACE FUNCTION "normalize_ai_search_query"(input TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
STRICT
AS $$
  SELECT lower(regexp_replace(btrim(input), '[[:space:]]+', ' ', 'g'));
$$;

ALTER TABLE "AISearchQuery"
  ADD COLUMN IF NOT EXISTS "normalizedQuery" TEXT,
  ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "AISearchQuery"
SET "normalizedQuery" = "normalize_ai_search_query"("query")
WHERE "normalizedQuery" IS NULL;

CREATE TEMP TABLE "_AISearchQueryKeeper" ON COMMIT DROP AS
SELECT
  duplicate."id" AS "duplicateId",
  keeper."id" AS "keeperId"
FROM "AISearchQuery" duplicate
JOIN LATERAL (
  SELECT candidate."id"
  FROM "AISearchQuery" candidate
  WHERE candidate."projectId" = duplicate."projectId"
    AND candidate."normalizedQuery" = duplicate."normalizedQuery"
  ORDER BY candidate."createdAt" ASC, candidate."id" ASC
  LIMIT 1
) keeper ON true
WHERE duplicate."id" <> keeper."id";

UPDATE "AISearchResult" result
SET "queryId" = mapping."keeperId"
FROM "_AISearchQueryKeeper" mapping
WHERE result."queryId" = mapping."duplicateId";

DELETE FROM "AISearchQuery" query
USING "_AISearchQueryKeeper" mapping
WHERE query."id" = mapping."duplicateId";

ALTER TABLE "AISearchQuery"
  ALTER COLUMN "normalizedQuery" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "AISearchQuery_projectId_normalizedQuery_key"
  ON "AISearchQuery"("projectId", "normalizedQuery");

CREATE INDEX IF NOT EXISTS "AISearchQuery_projectId_archivedAt_createdAt_idx"
  ON "AISearchQuery"("projectId", "archivedAt", "createdAt");

COMMIT;

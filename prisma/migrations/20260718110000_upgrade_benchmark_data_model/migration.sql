CREATE TYPE "BenchmarkTargetType" AS ENUM ('OWN', 'COMPETITOR');

ALTER TABLE "BenchmarkRun"
  ADD COLUMN "runKey" TEXT,
  ADD COLUMN "scopeHash" TEXT,
  ADD COLUMN "windowStart" TIMESTAMP(3),
  ADD COLUMN "windowEnd" TIMESTAMP(3),
  ADD COLUMN "queryCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "completedAt" TIMESTAMP(3);

UPDATE "BenchmarkRun"
SET
  "runKey" = 'legacy:' || "id",
  "scopeHash" = 'legacy:' || "id"
WHERE "runKey" IS NULL OR "scopeHash" IS NULL;

ALTER TABLE "BenchmarkRun"
  ALTER COLUMN "runKey" SET NOT NULL,
  ALTER COLUMN "scopeHash" SET NOT NULL;

ALTER TABLE "BenchmarkResult"
  ADD COLUMN "targetType" "BenchmarkTargetType",
  ADD COLUMN "targetKey" TEXT,
  ALTER COLUMN "competitorId" DROP NOT NULL,
  ADD COLUMN "visibilityScore" INTEGER,
  ADD COLUMN "entityScore" INTEGER,
  ADD COLUMN "schemaScore" INTEGER,
  ADD COLUMN "authorityScore" INTEGER,
  ADD COLUMN "citationScore" INTEGER,
  ADD COLUMN "simulationScore" INTEGER,
  ADD COLUMN "coverage" INTEGER,
  ADD COLUMN "confidence" INTEGER,
  ADD COLUMN "scoreBasis" TEXT;

UPDATE "BenchmarkResult" br
SET
  "targetType" = 'COMPETITOR',
  "targetKey" = 'COMPETITOR:' || br."competitorId",
  "scoreBasis" = run."methodVersion"
FROM "BenchmarkRun" run
WHERE run."id" = br."benchmarkRunId"
  AND (br."targetType" IS NULL OR br."targetKey" IS NULL OR br."scoreBasis" IS NULL);

ALTER TABLE "BenchmarkResult"
  ALTER COLUMN "targetType" SET NOT NULL,
  ALTER COLUMN "targetKey" SET NOT NULL;

WITH mention_canonical AS (
  SELECT
    "id",
    FIRST_VALUE("id") OVER (
      PARTITION BY "checkId", "normalizedName"
      ORDER BY "createdAt", "id"
    ) AS "canonicalId"
  FROM "VisibilityMention"
)
UPDATE "VisibilityCitation" citation
SET "mentionId" = mention_canonical."canonicalId"
FROM mention_canonical
WHERE citation."mentionId" = mention_canonical."id"
  AND mention_canonical."id" <> mention_canonical."canonicalId";

WITH duplicate_mentions AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "checkId", "normalizedName"
      ORDER BY "createdAt", "id"
    ) AS "duplicateRank"
  FROM "VisibilityMention"
)
DELETE FROM "VisibilityMention" mention
USING duplicate_mentions
WHERE mention."id" = duplicate_mentions."id"
  AND duplicate_mentions."duplicateRank" > 1;

DELETE FROM "VisibilityCitation" duplicate
USING "VisibilityCitation" original
WHERE duplicate."checkId" = original."checkId"
  AND duplicate."url" = original."url"
  AND (duplicate."createdAt", duplicate."id") > (original."createdAt", original."id");

DROP INDEX "BenchmarkRun_projectId_createdAt_idx";
DROP INDEX "BenchmarkResult_benchmarkRunId_competitorId_key";

CREATE UNIQUE INDEX "BenchmarkRun_projectId_runKey_key" ON "BenchmarkRun"("projectId", "runKey");
CREATE INDEX "BenchmarkRun_projectId_provider_createdAt_idx" ON "BenchmarkRun"("projectId", "provider", "createdAt");
CREATE UNIQUE INDEX "BenchmarkResult_benchmarkRunId_targetKey_key" ON "BenchmarkResult"("benchmarkRunId", "targetKey");
CREATE INDEX "BenchmarkResult_benchmarkRunId_ranking_idx" ON "BenchmarkResult"("benchmarkRunId", "ranking");
CREATE UNIQUE INDEX "VisibilityMention_checkId_normalizedName_key" ON "VisibilityMention"("checkId", "normalizedName");
CREATE UNIQUE INDEX "VisibilityCitation_checkId_url_key" ON "VisibilityCitation"("checkId", "url");
CREATE INDEX "CompetitorSnapshot_competitorId_methodVersion_createdAt_idx" ON "CompetitorSnapshot"("competitorId", "methodVersion", "createdAt");

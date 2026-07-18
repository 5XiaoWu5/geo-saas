CREATE TYPE "CompetitorStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');
CREATE TYPE "BenchmarkRunStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');
CREATE TYPE "SimulationTargetType" AS ENUM ('OWN', 'COMPETITOR');
CREATE TYPE "VisibilityEntityType" AS ENUM ('OWN', 'COMPETITOR', 'UNKNOWN');

ALTER TABLE "SimulationTask"
  ADD COLUMN "targetType" "SimulationTargetType" NOT NULL DEFAULT 'OWN',
  ADD COLUMN "competitorId" TEXT;

CREATE TABLE "CompetitorProfile" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "domain" TEXT NOT NULL,
  "normalizedDomain" TEXT NOT NULL,
  "industry" TEXT NOT NULL DEFAULT '',
  "region" TEXT NOT NULL DEFAULT '',
  "status" "CompetitorStatus" NOT NULL DEFAULT 'ACTIVE',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CompetitorProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CompetitorSnapshot" (
  "id" TEXT NOT NULL,
  "competitorId" TEXT NOT NULL,
  "overallScore" INTEGER,
  "visibilityScore" INTEGER,
  "entityScore" INTEGER,
  "schemaScore" INTEGER,
  "authorityScore" INTEGER,
  "citationScore" INTEGER,
  "methodVersion" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CompetitorSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BenchmarkRun" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "campaignId" TEXT,
  "provider" TEXT NOT NULL,
  "methodVersion" TEXT NOT NULL,
  "status" "BenchmarkRunStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BenchmarkRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BenchmarkResult" (
  "id" TEXT NOT NULL,
  "benchmarkRunId" TEXT NOT NULL,
  "competitorId" TEXT NOT NULL,
  "overallScore" INTEGER,
  "difference" INTEGER,
  "ranking" INTEGER,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BenchmarkResult_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VisibilityMention" (
  "id" TEXT NOT NULL,
  "checkId" TEXT NOT NULL,
  "competitorId" TEXT,
  "entityType" "VisibilityEntityType" NOT NULL,
  "brandName" TEXT NOT NULL,
  "normalizedName" TEXT NOT NULL,
  "position" INTEGER,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VisibilityMention_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VisibilityCitation" (
  "id" TEXT NOT NULL,
  "checkId" TEXT NOT NULL,
  "mentionId" TEXT,
  "url" TEXT NOT NULL,
  "domain" TEXT NOT NULL,
  "position" INTEGER,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VisibilityCitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CompetitorProfile_projectId_normalizedDomain_key" ON "CompetitorProfile"("projectId", "normalizedDomain");
CREATE INDEX "CompetitorProfile_projectId_idx" ON "CompetitorProfile"("projectId");
CREATE INDEX "CompetitorProfile_status_idx" ON "CompetitorProfile"("status");
CREATE UNIQUE INDEX "CompetitorSnapshot_competitorId_methodVersion_sourceId_key" ON "CompetitorSnapshot"("competitorId", "methodVersion", "sourceId");
CREATE INDEX "CompetitorSnapshot_competitorId_createdAt_idx" ON "CompetitorSnapshot"("competitorId", "createdAt");
CREATE INDEX "BenchmarkRun_projectId_createdAt_idx" ON "BenchmarkRun"("projectId", "createdAt");
CREATE INDEX "BenchmarkRun_campaignId_idx" ON "BenchmarkRun"("campaignId");
CREATE UNIQUE INDEX "BenchmarkResult_benchmarkRunId_competitorId_key" ON "BenchmarkResult"("benchmarkRunId", "competitorId");
CREATE INDEX "BenchmarkResult_competitorId_createdAt_idx" ON "BenchmarkResult"("competitorId", "createdAt");
CREATE INDEX "SimulationTask_competitorId_idx" ON "SimulationTask"("competitorId");
CREATE INDEX "VisibilityMention_checkId_position_idx" ON "VisibilityMention"("checkId", "position");
CREATE INDEX "VisibilityMention_competitorId_idx" ON "VisibilityMention"("competitorId");
CREATE INDEX "VisibilityCitation_checkId_idx" ON "VisibilityCitation"("checkId");
CREATE INDEX "VisibilityCitation_mentionId_idx" ON "VisibilityCitation"("mentionId");
CREATE INDEX "VisibilityCitation_domain_idx" ON "VisibilityCitation"("domain");

ALTER TABLE "CompetitorProfile" ADD CONSTRAINT "CompetitorProfile_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompetitorSnapshot" ADD CONSTRAINT "CompetitorSnapshot_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "CompetitorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BenchmarkRun" ADD CONSTRAINT "BenchmarkRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BenchmarkRun" ADD CONSTRAINT "BenchmarkRun_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "GeoCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BenchmarkResult" ADD CONSTRAINT "BenchmarkResult_benchmarkRunId_fkey" FOREIGN KEY ("benchmarkRunId") REFERENCES "BenchmarkRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BenchmarkResult" ADD CONSTRAINT "BenchmarkResult_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "CompetitorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SimulationTask" ADD CONSTRAINT "SimulationTask_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "CompetitorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VisibilityMention" ADD CONSTRAINT "VisibilityMention_checkId_fkey" FOREIGN KEY ("checkId") REFERENCES "VisibilityCheck"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VisibilityMention" ADD CONSTRAINT "VisibilityMention_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "CompetitorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VisibilityCitation" ADD CONSTRAINT "VisibilityCitation_checkId_fkey" FOREIGN KEY ("checkId") REFERENCES "VisibilityCheck"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VisibilityCitation" ADD CONSTRAINT "VisibilityCitation_mentionId_fkey" FOREIGN KEY ("mentionId") REFERENCES "VisibilityMention"("id") ON DELETE SET NULL ON UPDATE CASCADE;

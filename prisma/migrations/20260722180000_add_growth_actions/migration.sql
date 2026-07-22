CREATE TYPE "GrowthActionCategory" AS ENUM ('SEO', 'GEO', 'AI_SEARCH', 'KNOWLEDGE', 'COMPETITOR');
CREATE TYPE "GrowthActionPriority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');
CREATE TYPE "GrowthActionStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'COMPLETED', 'VERIFIED');
CREATE TYPE "GrowthActionImpact" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

CREATE TABLE "GrowthAction" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "opportunityId" TEXT,
  "optimizationTaskId" TEXT,
  "sourceKey" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "category" "GrowthActionCategory" NOT NULL,
  "priority" "GrowthActionPriority" NOT NULL,
  "status" "GrowthActionStatus" NOT NULL DEFAULT 'TODO',
  "impact" "GrowthActionImpact" NOT NULL,
  "createdBy" TEXT NOT NULL,
  "completedAt" TIMESTAMP(3),
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GrowthAction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GrowthAction_projectId_sourceKey_key" ON "GrowthAction"("projectId", "sourceKey");
CREATE INDEX "GrowthAction_projectId_status_createdAt_idx" ON "GrowthAction"("projectId", "status", "createdAt");
CREATE INDEX "GrowthAction_optimizationTaskId_idx" ON "GrowthAction"("optimizationTaskId");

ALTER TABLE "GrowthAction" ADD CONSTRAINT "GrowthAction_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GrowthAction" ADD CONSTRAINT "GrowthAction_optimizationTaskId_fkey" FOREIGN KEY ("optimizationTaskId") REFERENCES "OptimizationTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

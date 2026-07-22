CREATE TYPE "GrowthAgentTaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'COMPLETED', 'VERIFIED');

CREATE TABLE "GrowthAgentTask" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "actionId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "category" "GrowthActionCategory" NOT NULL,
  "status" "GrowthAgentTaskStatus" NOT NULL DEFAULT 'TODO',
  "priority" "GrowthActionPriority" NOT NULL,
  "confidence" INTEGER NOT NULL,
  "expectedImpact" JSONB NOT NULL,
  "executionPlan" JSONB NOT NULL,
  "verificationPlan" JSONB NOT NULL,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GrowthAgentTask_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GrowthAgentTask_projectId_actionId_key" ON "GrowthAgentTask"("projectId", "actionId");
CREATE INDEX "GrowthAgentTask_projectId_status_createdAt_idx" ON "GrowthAgentTask"("projectId", "status", "createdAt");
CREATE INDEX "GrowthAgentTask_actionId_idx" ON "GrowthAgentTask"("actionId");

ALTER TABLE "GrowthAgentTask" ADD CONSTRAINT "GrowthAgentTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GrowthAgentTask" ADD CONSTRAINT "GrowthAgentTask_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "GrowthAction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

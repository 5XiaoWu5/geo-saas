CREATE TYPE "AutomationMode" AS ENUM ('SAFE', 'STANDARD', 'EXPERT');
CREATE TYPE "AutomationRunStatus" AS ENUM ('PREVIEW', 'AWAITING_APPROVAL', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED');
CREATE TYPE "AutomationRiskLevel" AS ENUM ('SAFE', 'INTERNAL_WRITE', 'EXTERNAL_COST', 'EXTERNAL_WRITE');
CREATE TYPE "AutomationStepStatus" AS ENUM ('PENDING', 'AWAITING_APPROVAL', 'RUNNING', 'COMPLETED', 'FAILED', 'SKIPPED', 'CANCELLED');

CREATE TABLE "AutomationRun" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "mode" "AutomationMode" NOT NULL,
  "status" "AutomationRunStatus" NOT NULL DEFAULT 'PREVIEW',
  "progress" INTEGER NOT NULL DEFAULT 0,
  "currentStepKey" TEXT,
  "beforeSnapshot" JSONB NOT NULL DEFAULT '{}',
  "afterSnapshot" JSONB,
  "summary" JSONB,
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AutomationRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AutomationStep" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "stepKey" TEXT NOT NULL,
  "stepType" TEXT NOT NULL,
  "riskLevel" "AutomationRiskLevel" NOT NULL,
  "status" "AutomationStepStatus" NOT NULL DEFAULT 'PENDING',
  "title" TEXT NOT NULL,
  "activityMessage" TEXT NOT NULL,
  "inputEvidence" JSONB NOT NULL DEFAULT '{}',
  "outputEvidence" JSONB,
  "approvalSummary" JSONB,
  "approvedBy" TEXT,
  "approvedAt" TIMESTAMP(3),
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "durationMs" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AutomationStep_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AutomationStep_runId_sequence_key" ON "AutomationStep"("runId", "sequence");
CREATE UNIQUE INDEX "AutomationStep_runId_stepKey_key" ON "AutomationStep"("runId", "stepKey");
CREATE UNIQUE INDEX "AutomationRun_id_projectId_key" ON "AutomationRun"("id", "projectId");
CREATE INDEX "AutomationRun_projectId_createdAt_idx" ON "AutomationRun"("projectId", "createdAt");
CREATE INDEX "AutomationRun_projectId_status_updatedAt_idx" ON "AutomationRun"("projectId", "status", "updatedAt");
CREATE INDEX "AutomationRun_createdBy_createdAt_idx" ON "AutomationRun"("createdBy", "createdAt");
CREATE INDEX "AutomationStep_projectId_status_createdAt_idx" ON "AutomationStep"("projectId", "status", "createdAt");
CREATE INDEX "AutomationStep_runId_status_sequence_idx" ON "AutomationStep"("runId", "status", "sequence");

ALTER TABLE "AutomationRun" ADD CONSTRAINT "AutomationRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AutomationStep" ADD CONSTRAINT "AutomationStep_runId_projectId_fkey" FOREIGN KEY ("runId", "projectId") REFERENCES "AutomationRun"("id", "projectId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AutomationStep" ADD CONSTRAINT "AutomationStep_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AISearchProviderConfig" ADD COLUMN "lastTestStatus" TEXT;
ALTER TABLE "AISearchProviderConfig" ADD COLUMN "lastTestError" TEXT;
ALTER TABLE "AISearchProviderConfig" ADD COLUMN "lastTestedAt" TIMESTAMP(3);

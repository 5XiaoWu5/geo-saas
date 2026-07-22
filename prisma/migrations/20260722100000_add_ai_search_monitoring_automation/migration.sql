DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'GrowthEventType') THEN
        ALTER TYPE "GrowthEventType" ADD VALUE IF NOT EXISTS 'AI_SEARCH';
    ELSE
        EXECUTE 'CREATE TYPE "GrowthEventType" AS ENUM (''SCAN'', ''ENTITY'', ''SIMULATION'', ''VISIBILITY'', ''OPTIMIZATION'', ''AI_SEARCH'')';
        EXECUTE 'CREATE CAST ("GrowthEventType" AS text) WITH INOUT AS IMPLICIT';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'GrowthTriggerType') THEN
        EXECUTE 'CREATE TYPE "GrowthTriggerType" AS ENUM (''MANUAL'', ''AUTO'', ''SCHEDULE'', ''API'')';
        EXECUTE 'CREATE CAST ("GrowthTriggerType" AS text) WITH INOUT AS IMPLICIT';
    END IF;
END $$;

CREATE TYPE "MonitoringFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');
CREATE TYPE "MonitoringScheduleStatus" AS ENUM ('ACTIVE', 'PAUSED');
CREATE TYPE "MonitoringHistoryStatus" AS ENUM ('SUCCEEDED', 'FAILED', 'PARTIAL');
CREATE TYPE "NotificationType" AS ENUM ('REAL_AI_VISIBILITY_DROP', 'REAL_AI_VISIBILITY_GAIN', 'CITATION_DROP', 'CITATION_INCREASE', 'RANKING_DROP', 'RANKING_IMPROVED', 'PROVIDER_FAILED');
CREATE TYPE "NotificationLevel" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

CREATE TABLE "MonitoringSchedule" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "frequency" "MonitoringFrequency" NOT NULL DEFAULT 'DAILY',
    "dailyTime" TEXT NOT NULL DEFAULT '09:00',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Shanghai',
    "nextRunAt" TIMESTAMP(3),
    "lastRunAt" TIMESTAMP(3),
    "status" "MonitoringScheduleStatus" NOT NULL DEFAULT 'PAUSED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MonitoringSchedule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MonitoringHistory" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "scheduleId" TEXT,
    "provider" "AISearchProviderType" NOT NULL,
    "status" "MonitoringHistoryStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER,
    "errorMessage" TEXT,
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "resultIds" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MonitoringHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "optimizationTaskId" TEXT,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "level" "NotificationLevel" NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "sourceKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MonitoringSchedule_projectId_key" ON "MonitoringSchedule"("projectId");
CREATE INDEX "MonitoringSchedule_enabled_nextRunAt_idx" ON "MonitoringSchedule"("enabled", "nextRunAt");
CREATE INDEX "MonitoringHistory_projectId_createdAt_idx" ON "MonitoringHistory"("projectId", "createdAt");
CREATE INDEX "MonitoringHistory_projectId_provider_status_idx" ON "MonitoringHistory"("projectId", "provider", "status");
CREATE UNIQUE INDEX "Notification_projectId_sourceKey_key" ON "Notification"("projectId", "sourceKey");
CREATE INDEX "Notification_projectId_isRead_createdAt_idx" ON "Notification"("projectId", "isRead", "createdAt");
CREATE INDEX "Notification_optimizationTaskId_idx" ON "Notification"("optimizationTaskId");

ALTER TABLE "MonitoringSchedule" ADD CONSTRAINT "MonitoringSchedule_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MonitoringHistory" ADD CONSTRAINT "MonitoringHistory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MonitoringHistory" ADD CONSTRAINT "MonitoringHistory_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "MonitoringSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_optimizationTaskId_fkey" FOREIGN KEY ("optimizationTaskId") REFERENCES "OptimizationTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

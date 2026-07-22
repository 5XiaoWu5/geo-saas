CREATE TYPE "GrowthReportStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

CREATE TABLE "GrowthReport" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "generatedBy" TEXT NOT NULL,
    "status" "GrowthReportStatus" NOT NULL DEFAULT 'PROCESSING',
    "dataVersion" TEXT NOT NULL,
    "methodVersion" TEXT NOT NULL DEFAULT 'growth-report-v1',
    "snapshot" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GrowthReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GrowthReport_projectId_version_key" ON "GrowthReport"("projectId", "version");
CREATE INDEX "GrowthReport_projectId_createdAt_idx" ON "GrowthReport"("projectId", "createdAt");
CREATE INDEX "GrowthReport_generatedBy_createdAt_idx" ON "GrowthReport"("generatedBy", "createdAt");

ALTER TABLE "GrowthReport" ADD CONSTRAINT "GrowthReport_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

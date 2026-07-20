CREATE TYPE "KnowledgeImportSourceType" AS ENUM ('FILE', 'WEBSITE_URL');
CREATE TYPE "KnowledgeImportStatus" AS ENUM ('UPLOADING', 'PROCESSING', 'COMPLETED', 'FAILED');

CREATE TABLE "KnowledgeImportJob" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "sourceDocumentId" TEXT NOT NULL,
  "sourceType" "KnowledgeImportSourceType" NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "status" "KnowledgeImportStatus" NOT NULL DEFAULT 'UPLOADING',
  "progress" INTEGER NOT NULL DEFAULT 0,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "KnowledgeImportJob_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "KnowledgeImportJob_progress_check" CHECK ("progress" BETWEEN 0 AND 100)
);

CREATE TABLE "KnowledgeExtractionResult" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "importJobId" TEXT NOT NULL,
  "sourceDocumentId" TEXT NOT NULL,
  "extractedProducts" JSONB NOT NULL DEFAULT '[]',
  "extractedAdvantages" JSONB NOT NULL DEFAULT '[]',
  "extractedFeatures" JSONB NOT NULL DEFAULT '[]',
  "extractedApplications" JSONB NOT NULL DEFAULT '[]',
  "extractedCustomers" JSONB NOT NULL DEFAULT '[]',
  "extractedFAQ" JSONB NOT NULL DEFAULT '[]',
  "confidence" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "KnowledgeExtractionResult_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "KnowledgeExtractionResult_confidence_check" CHECK ("confidence" IS NULL OR "confidence" BETWEEN 0 AND 100)
);

CREATE UNIQUE INDEX "KnowledgeImportJob_id_projectId_key" ON "KnowledgeImportJob"("id", "projectId");
CREATE INDEX "KnowledgeImportJob_projectId_status_createdAt_idx" ON "KnowledgeImportJob"("projectId", "status", "createdAt");
CREATE INDEX "KnowledgeImportJob_sourceDocumentId_idx" ON "KnowledgeImportJob"("sourceDocumentId");
CREATE UNIQUE INDEX "KnowledgeExtractionResult_importJobId_key" ON "KnowledgeExtractionResult"("importJobId");
CREATE UNIQUE INDEX "KnowledgeExtractionResult_importJobId_projectId_key" ON "KnowledgeExtractionResult"("importJobId", "projectId");
CREATE INDEX "KnowledgeExtractionResult_projectId_createdAt_idx" ON "KnowledgeExtractionResult"("projectId", "createdAt");
CREATE INDEX "KnowledgeExtractionResult_sourceDocumentId_idx" ON "KnowledgeExtractionResult"("sourceDocumentId");

ALTER TABLE "KnowledgeImportJob" ADD CONSTRAINT "KnowledgeImportJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KnowledgeImportJob" ADD CONSTRAINT "KnowledgeImportJob_sourceDocumentId_projectId_fkey" FOREIGN KEY ("sourceDocumentId", "projectId") REFERENCES "KnowledgeDocument"("id", "projectId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KnowledgeExtractionResult" ADD CONSTRAINT "KnowledgeExtractionResult_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KnowledgeExtractionResult" ADD CONSTRAINT "KnowledgeExtractionResult_importJobId_projectId_fkey" FOREIGN KEY ("importJobId", "projectId") REFERENCES "KnowledgeImportJob"("id", "projectId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KnowledgeExtractionResult" ADD CONSTRAINT "KnowledgeExtractionResult_sourceDocumentId_projectId_fkey" FOREIGN KEY ("sourceDocumentId", "projectId") REFERENCES "KnowledgeDocument"("id", "projectId") ON DELETE CASCADE ON UPDATE CASCADE;

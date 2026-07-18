CREATE TYPE "KnowledgeStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
CREATE TYPE "KnowledgeSourceType" AS ENUM ('USER_INPUT', 'FILE_UPLOAD', 'WEBSITE_CRAWL', 'AI_GENERATED');
CREATE TYPE "KnowledgeProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');

CREATE TABLE "CompanyKnowledgeBase" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "status" "KnowledgeStatus" NOT NULL DEFAULT 'DRAFT',
  "version" INTEGER NOT NULL DEFAULT 1,
  "completenessScore" INTEGER,
  "understandingScore" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CompanyKnowledgeBase_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CompanyKnowledgeBase_scores_check" CHECK (("completenessScore" IS NULL OR "completenessScore" BETWEEN 0 AND 100) AND ("understandingScore" IS NULL OR "understandingScore" BETWEEN 0 AND 100))
);

CREATE TABLE "KnowledgeSource" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "knowledgeBaseId" TEXT NOT NULL,
  "type" "KnowledgeSourceType" NOT NULL,
  "sourceName" TEXT NOT NULL,
  "sourceKey" TEXT NOT NULL,
  "url" TEXT,
  "checksum" TEXT,
  "confidence" INTEGER,
  "status" "KnowledgeStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "KnowledgeSource_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "KnowledgeSource_confidence_check" CHECK ("confidence" IS NULL OR "confidence" BETWEEN 0 AND 100)
);

CREATE TABLE "KnowledgeDocument" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "knowledgeBaseId" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "processingStatus" "KnowledgeProcessingStatus" NOT NULL DEFAULT 'PENDING',
  "extractedTextStatus" "KnowledgeProcessingStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "KnowledgeDocument_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "KnowledgeDocument_size_check" CHECK ("size" >= 0)
);

CREATE TABLE "ProductEntity" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "knowledgeBaseId" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "features" JSONB NOT NULL DEFAULT '[]',
  "applications" JSONB NOT NULL DEFAULT '[]',
  "targetCustomers" JSONB NOT NULL DEFAULT '[]',
  "confidence" INTEGER,
  "status" "KnowledgeStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductEntity_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProductEntity_confidence_check" CHECK ("confidence" IS NULL OR "confidence" BETWEEN 0 AND 100)
);

CREATE TABLE "ServiceEntity" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "knowledgeBaseId" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "industries" JSONB NOT NULL DEFAULT '[]',
  "confidence" INTEGER,
  "status" "KnowledgeStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServiceEntity_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ServiceEntity_confidence_check" CHECK ("confidence" IS NULL OR "confidence" BETWEEN 0 AND 100)
);

CREATE TABLE "CustomerCase" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "knowledgeBaseId" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "customerName" TEXT NOT NULL,
  "industry" TEXT NOT NULL,
  "problem" TEXT NOT NULL,
  "solution" TEXT NOT NULL,
  "result" TEXT NOT NULL,
  "metrics" JSONB NOT NULL DEFAULT '{}',
  "confidence" INTEGER,
  "status" "KnowledgeStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomerCase_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CustomerCase_confidence_check" CHECK ("confidence" IS NULL OR "confidence" BETWEEN 0 AND 100)
);

CREATE TABLE "TechnicalDocument" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "knowledgeBaseId" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "technicalFields" JSONB NOT NULL DEFAULT '{}',
  "confidence" INTEGER,
  "status" "KnowledgeStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TechnicalDocument_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TechnicalDocument_confidence_check" CHECK ("confidence" IS NULL OR "confidence" BETWEEN 0 AND 100)
);

CREATE TABLE "KnowledgeChunk" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "hash" TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  "tokenCount" INTEGER NOT NULL,
  "confidence" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KnowledgeChunk_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "KnowledgeChunk_values_check" CHECK ("order" >= 0 AND "tokenCount" >= 0 AND ("confidence" IS NULL OR "confidence" BETWEEN 0 AND 100))
);

CREATE UNIQUE INDEX "CompanyKnowledgeBase_projectId_key" ON "CompanyKnowledgeBase"("projectId");
CREATE UNIQUE INDEX "CompanyKnowledgeBase_id_projectId_key" ON "CompanyKnowledgeBase"("id", "projectId");
CREATE INDEX "CompanyKnowledgeBase_projectId_status_idx" ON "CompanyKnowledgeBase"("projectId", "status");
CREATE UNIQUE INDEX "KnowledgeSource_id_projectId_key" ON "KnowledgeSource"("id", "projectId");
CREATE UNIQUE INDEX "KnowledgeSource_projectId_sourceKey_key" ON "KnowledgeSource"("projectId", "sourceKey");
CREATE INDEX "KnowledgeSource_projectId_type_status_idx" ON "KnowledgeSource"("projectId", "type", "status");
CREATE INDEX "KnowledgeSource_knowledgeBaseId_idx" ON "KnowledgeSource"("knowledgeBaseId");
CREATE UNIQUE INDEX "KnowledgeDocument_sourceId_key" ON "KnowledgeDocument"("sourceId");
CREATE UNIQUE INDEX "KnowledgeDocument_id_projectId_key" ON "KnowledgeDocument"("id", "projectId");
CREATE UNIQUE INDEX "KnowledgeDocument_sourceId_projectId_key" ON "KnowledgeDocument"("sourceId", "projectId");
CREATE INDEX "KnowledgeDocument_projectId_processingStatus_createdAt_idx" ON "KnowledgeDocument"("projectId", "processingStatus", "createdAt");
CREATE INDEX "KnowledgeDocument_knowledgeBaseId_idx" ON "KnowledgeDocument"("knowledgeBaseId");
CREATE INDEX "ProductEntity_projectId_status_updatedAt_idx" ON "ProductEntity"("projectId", "status", "updatedAt");
CREATE INDEX "ProductEntity_knowledgeBaseId_idx" ON "ProductEntity"("knowledgeBaseId");
CREATE INDEX "ProductEntity_sourceId_idx" ON "ProductEntity"("sourceId");
CREATE INDEX "ServiceEntity_projectId_status_updatedAt_idx" ON "ServiceEntity"("projectId", "status", "updatedAt");
CREATE INDEX "ServiceEntity_knowledgeBaseId_idx" ON "ServiceEntity"("knowledgeBaseId");
CREATE INDEX "ServiceEntity_sourceId_idx" ON "ServiceEntity"("sourceId");
CREATE INDEX "CustomerCase_projectId_status_updatedAt_idx" ON "CustomerCase"("projectId", "status", "updatedAt");
CREATE INDEX "CustomerCase_knowledgeBaseId_idx" ON "CustomerCase"("knowledgeBaseId");
CREATE INDEX "CustomerCase_sourceId_idx" ON "CustomerCase"("sourceId");
CREATE INDEX "TechnicalDocument_projectId_status_updatedAt_idx" ON "TechnicalDocument"("projectId", "status", "updatedAt");
CREATE INDEX "TechnicalDocument_knowledgeBaseId_idx" ON "TechnicalDocument"("knowledgeBaseId");
CREATE INDEX "TechnicalDocument_sourceId_idx" ON "TechnicalDocument"("sourceId");
CREATE UNIQUE INDEX "KnowledgeChunk_documentId_order_key" ON "KnowledgeChunk"("documentId", "order");
CREATE INDEX "KnowledgeChunk_projectId_hash_idx" ON "KnowledgeChunk"("projectId", "hash");
CREATE INDEX "KnowledgeChunk_documentId_idx" ON "KnowledgeChunk"("documentId");

ALTER TABLE "CompanyKnowledgeBase" ADD CONSTRAINT "CompanyKnowledgeBase_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KnowledgeSource" ADD CONSTRAINT "KnowledgeSource_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KnowledgeSource" ADD CONSTRAINT "KnowledgeSource_knowledgeBaseId_projectId_fkey" FOREIGN KEY ("knowledgeBaseId", "projectId") REFERENCES "CompanyKnowledgeBase"("id", "projectId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KnowledgeDocument" ADD CONSTRAINT "KnowledgeDocument_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KnowledgeDocument" ADD CONSTRAINT "KnowledgeDocument_knowledgeBaseId_projectId_fkey" FOREIGN KEY ("knowledgeBaseId", "projectId") REFERENCES "CompanyKnowledgeBase"("id", "projectId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KnowledgeDocument" ADD CONSTRAINT "KnowledgeDocument_sourceId_projectId_fkey" FOREIGN KEY ("sourceId", "projectId") REFERENCES "KnowledgeSource"("id", "projectId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductEntity" ADD CONSTRAINT "ProductEntity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductEntity" ADD CONSTRAINT "ProductEntity_knowledgeBaseId_projectId_fkey" FOREIGN KEY ("knowledgeBaseId", "projectId") REFERENCES "CompanyKnowledgeBase"("id", "projectId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductEntity" ADD CONSTRAINT "ProductEntity_sourceId_projectId_fkey" FOREIGN KEY ("sourceId", "projectId") REFERENCES "KnowledgeSource"("id", "projectId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServiceEntity" ADD CONSTRAINT "ServiceEntity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServiceEntity" ADD CONSTRAINT "ServiceEntity_knowledgeBaseId_projectId_fkey" FOREIGN KEY ("knowledgeBaseId", "projectId") REFERENCES "CompanyKnowledgeBase"("id", "projectId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServiceEntity" ADD CONSTRAINT "ServiceEntity_sourceId_projectId_fkey" FOREIGN KEY ("sourceId", "projectId") REFERENCES "KnowledgeSource"("id", "projectId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerCase" ADD CONSTRAINT "CustomerCase_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerCase" ADD CONSTRAINT "CustomerCase_knowledgeBaseId_projectId_fkey" FOREIGN KEY ("knowledgeBaseId", "projectId") REFERENCES "CompanyKnowledgeBase"("id", "projectId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerCase" ADD CONSTRAINT "CustomerCase_sourceId_projectId_fkey" FOREIGN KEY ("sourceId", "projectId") REFERENCES "KnowledgeSource"("id", "projectId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TechnicalDocument" ADD CONSTRAINT "TechnicalDocument_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TechnicalDocument" ADD CONSTRAINT "TechnicalDocument_knowledgeBaseId_projectId_fkey" FOREIGN KEY ("knowledgeBaseId", "projectId") REFERENCES "CompanyKnowledgeBase"("id", "projectId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TechnicalDocument" ADD CONSTRAINT "TechnicalDocument_sourceId_projectId_fkey" FOREIGN KEY ("sourceId", "projectId") REFERENCES "KnowledgeSource"("id", "projectId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KnowledgeChunk" ADD CONSTRAINT "KnowledgeChunk_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KnowledgeChunk" ADD CONSTRAINT "KnowledgeChunk_documentId_projectId_fkey" FOREIGN KEY ("documentId", "projectId") REFERENCES "KnowledgeDocument"("id", "projectId") ON DELETE CASCADE ON UPDATE CASCADE;

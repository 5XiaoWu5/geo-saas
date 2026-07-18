CREATE TABLE "CompanyKnowledgeProfile" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "companySummary" TEXT,
  "industry" TEXT,
  "businessType" TEXT,
  "mainProducts" JSONB NOT NULL DEFAULT '[]',
  "mainServices" JSONB NOT NULL DEFAULT '[]',
  "targetCustomers" JSONB NOT NULL DEFAULT '[]',
  "competitiveAdvantages" JSONB NOT NULL DEFAULT '[]',
  "certifications" JSONB NOT NULL DEFAULT '[]',
  "customerProof" JSONB NOT NULL DEFAULT '[]',
  "faqTopics" JSONB NOT NULL DEFAULT '[]',
  "missingKnowledge" JSONB NOT NULL DEFAULT '[]',
  "confidence" INTEGER,
  "status" "KnowledgeStatus" NOT NULL DEFAULT 'DRAFT',
  "methodVersion" TEXT NOT NULL DEFAULT 'rules-v1',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CompanyKnowledgeProfile_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CompanyKnowledgeProfile_confidence_check" CHECK ("confidence" IS NULL OR "confidence" BETWEEN 0 AND 100)
);

CREATE UNIQUE INDEX "CompanyKnowledgeProfile_projectId_key" ON "CompanyKnowledgeProfile"("projectId");
CREATE INDEX "CompanyKnowledgeProfile_projectId_status_updatedAt_idx" ON "CompanyKnowledgeProfile"("projectId", "status", "updatedAt");

ALTER TABLE "CompanyKnowledgeProfile" ADD CONSTRAINT "CompanyKnowledgeProfile_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

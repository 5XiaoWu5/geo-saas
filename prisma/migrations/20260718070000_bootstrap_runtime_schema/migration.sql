-- Formal bootstrap for the schema that was historically created at application runtime.
-- Every statement is additive/idempotent so this migration is safe for both empty
-- databases and databases that already received some or all of the legacy runtime DDL.

CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "role" TEXT NOT NULL DEFAULT 'admin',
  "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  "image" TEXT,
  "passwordHash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

CREATE TABLE IF NOT EXISTS "Session" (
  "id" TEXT PRIMARY KEY,
  "token" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "Session_token_key" ON "Session"("token");
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");

CREATE TABLE IF NOT EXISTS "Account" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "accessTokenExpiresAt" TIMESTAMP(3),
  "refreshTokenExpiresAt" TIMESTAMP(3),
  "scope" TEXT,
  "idToken" TEXT,
  "password" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "Account_providerId_accountId_key" ON "Account"("providerId", "accountId");
CREATE INDEX IF NOT EXISTS "Account_userId_idx" ON "Account"("userId");

CREATE TABLE IF NOT EXISTS "Verification" (
  "id" TEXT PRIMARY KEY,
  "identifier" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" TEXT
);
CREATE INDEX IF NOT EXISTS "Verification_identifier_idx" ON "Verification"("identifier");
CREATE INDEX IF NOT EXISTS "Verification_userId_idx" ON "Verification"("userId");

CREATE TABLE IF NOT EXISTS "PasswordReset" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "PasswordReset_token_key" ON "PasswordReset"("token");
CREATE INDEX IF NOT EXISTS "PasswordReset_userId_idx" ON "PasswordReset"("userId");

CREATE TABLE IF NOT EXISTS "Project" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT,
  "name" TEXT NOT NULL,
  "domain" TEXT NOT NULL,
  "language" TEXT NOT NULL DEFAULT 'English',
  "country" TEXT NOT NULL DEFAULT 'United States',
  "industry" TEXT NOT NULL DEFAULT 'SaaS',
  "description" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'Active',
  "reportsCount" INTEGER NOT NULL DEFAULT 0,
  "geoScore" INTEGER NOT NULL DEFAULT 0,
  "visibilityScore" INTEGER NOT NULL DEFAULT 0,
  "visibility" INTEGER NOT NULL DEFAULT 0,
  "lastAnalysisAt" TIMESTAMP(3),
  "lastScan" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "language" TEXT NOT NULL DEFAULT 'English';
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "country" TEXT NOT NULL DEFAULT 'United States';
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "industry" TEXT NOT NULL DEFAULT 'SaaS';
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "description" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "reportsCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "geoScore" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "visibilityScore" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "visibility" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "lastAnalysisAt" TIMESTAMP(3);
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "lastScan" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "Project_userId_idx" ON "Project"("userId");

CREATE TABLE IF NOT EXISTS "WebsiteScan" (
  "id" TEXT PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "title" TEXT,
  "description" TEXT,
  "h1Count" INTEGER NOT NULL DEFAULT 0,
  "h2Count" INTEGER NOT NULL DEFAULT 0,
  "internalLinkCount" INTEGER NOT NULL DEFAULT 0,
  "externalLinkCount" INTEGER NOT NULL DEFAULT 0,
  "schemaCount" INTEGER NOT NULL DEFAULT 0,
  "schemaTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "robotsExists" BOOLEAN NOT NULL DEFAULT false,
  "sitemapExists" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "WebsiteScan" ADD COLUMN IF NOT EXISTS "schemaTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
CREATE INDEX IF NOT EXISTS "WebsiteScan_projectId_idx" ON "WebsiteScan"("projectId");

CREATE TABLE IF NOT EXISTS "GeoAnalysis" (
  "id" TEXT PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "scanId" TEXT NOT NULL,
  "totalScore" INTEGER NOT NULL,
  "entityScore" INTEGER NOT NULL,
  "schemaScore" INTEGER NOT NULL,
  "technicalScore" INTEGER NOT NULL,
  "contentScore" INTEGER NOT NULL,
  "issues" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "GeoAnalysis_scanId_key" ON "GeoAnalysis"("scanId");
CREATE INDEX IF NOT EXISTS "GeoAnalysis_projectId_idx" ON "GeoAnalysis"("projectId");
CREATE INDEX IF NOT EXISTS "GeoAnalysis_scanId_idx" ON "GeoAnalysis"("scanId");

CREATE TABLE IF NOT EXISTS "GeoBrainAnalysis" (
  "id" TEXT PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "score" INTEGER NOT NULL,
  "scoreDetails" JSONB NOT NULL DEFAULT '{}',
  "insights" JSONB NOT NULL DEFAULT '[]',
  "problems" JSONB NOT NULL DEFAULT '[]',
  "recommendations" JSONB NOT NULL DEFAULT '[]',
  "aiSummary" TEXT NOT NULL DEFAULT '',
  "provider" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "GeoBrainAnalysis" ADD COLUMN IF NOT EXISTS "scoreDetails" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "GeoBrainAnalysis" ADD COLUMN IF NOT EXISTS "problems" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "GeoBrainAnalysis" ADD COLUMN IF NOT EXISTS "aiSummary" TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS "GeoBrainAnalysis_projectId_idx" ON "GeoBrainAnalysis"("projectId");

CREATE TABLE IF NOT EXISTS "OptimizationTask" (
  "id" TEXT PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "issueId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "recommendation" TEXT NOT NULL DEFAULT '',
  "severity" TEXT NOT NULL DEFAULT 'Medium',
  "category" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "OptimizationTask" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS "OptimizationTask_projectId_idx" ON "OptimizationTask"("projectId");
CREATE UNIQUE INDEX IF NOT EXISTS "OptimizationTask_projectId_issueId_key" ON "OptimizationTask"("projectId", "issueId");

CREATE TABLE IF NOT EXISTS "QueryTemplate" (
  "id" TEXT PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "intent" TEXT NOT NULL,
  "priority" TEXT NOT NULL DEFAULT 'medium',
  "status" TEXT NOT NULL DEFAULT 'GENERATED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "QueryTemplate_projectId_idx" ON "QueryTemplate"("projectId");

CREATE TABLE IF NOT EXISTS "EntityProfile" (
  "id" TEXT PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "brandName" TEXT NOT NULL,
  "industry" TEXT NOT NULL,
  "region" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "services" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "products" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "advantages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "EntityProfile_projectId_idx" ON "EntityProfile"("projectId");

CREATE TABLE IF NOT EXISTS "EntityAttribute" (
  "id" TEXT PRIMARY KEY,
  "entityId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "EntityAttribute_entityId_idx" ON "EntityAttribute"("entityId");

CREATE TABLE IF NOT EXISTS "GeoCampaign" (
  "id" TEXT PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "industry" TEXT NOT NULL,
  "businessDescription" TEXT NOT NULL DEFAULT '',
  "goal" TEXT NOT NULL DEFAULT '',
  "platforms" JSONB NOT NULL DEFAULT '[]',
  "queryCount" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "GeoCampaign_projectId_idx" ON "GeoCampaign"("projectId");

CREATE TABLE IF NOT EXISTS "GeoQuery" (
  "id" TEXT PRIMARY KEY,
  "campaignId" TEXT NOT NULL,
  "query" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "intent" TEXT NOT NULL,
  "priority" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'MONITORING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "GeoQuery_campaignId_idx" ON "GeoQuery"("campaignId");

CREATE TABLE IF NOT EXISTS "VisibilityCampaign" (
  "id" TEXT PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "keyword" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "VisibilityCampaign_projectId_idx" ON "VisibilityCampaign"("projectId");

CREATE TABLE IF NOT EXISTS "VisibilityPrompt" (
  "id" TEXT PRIMARY KEY,
  "campaignId" TEXT NOT NULL,
  "prompt" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "VisibilityPrompt_campaignId_idx" ON "VisibilityPrompt"("campaignId");

CREATE TABLE IF NOT EXISTS "VisibilityCheck" (
  "id" TEXT PRIMARY KEY,
  "campaignId" TEXT NOT NULL,
  "promptId" TEXT,
  "provider" TEXT NOT NULL,
  "prompt" TEXT NOT NULL,
  "answer" TEXT NOT NULL,
  "brandMentioned" BOOLEAN NOT NULL DEFAULT false,
  "mentionPosition" INTEGER,
  "sourceUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "score" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "VisibilityCheck" ADD COLUMN IF NOT EXISTS "promptId" TEXT;
ALTER TABLE "VisibilityCheck" ADD COLUMN IF NOT EXISTS "mentionPosition" INTEGER;
ALTER TABLE "VisibilityCheck" ADD COLUMN IF NOT EXISTS "sourceUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'VisibilityCheck' AND column_name = 'position') THEN
    UPDATE "VisibilityCheck" SET "mentionPosition" = "position" WHERE "mentionPosition" IS NULL;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "VisibilityCheck_campaignId_idx" ON "VisibilityCheck"("campaignId");
CREATE INDEX IF NOT EXISTS "VisibilityCheck_promptId_idx" ON "VisibilityCheck"("promptId");

CREATE TABLE IF NOT EXISTS "SimulationTask" (
  "id" TEXT PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "campaignId" TEXT,
  "queryId" TEXT,
  "query" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "SimulationTask_projectId_idx" ON "SimulationTask"("projectId");
CREATE INDEX IF NOT EXISTS "SimulationTask_campaignId_idx" ON "SimulationTask"("campaignId");
CREATE INDEX IF NOT EXISTS "SimulationTask_queryId_idx" ON "SimulationTask"("queryId");

CREATE TABLE IF NOT EXISTS "SimulationResult" (
  "id" TEXT PRIMARY KEY,
  "taskId" TEXT NOT NULL,
  "probability" INTEGER NOT NULL,
  "ranking" INTEGER,
  "confidence" INTEGER NOT NULL,
  "entityScore" INTEGER NOT NULL,
  "schemaScore" INTEGER NOT NULL,
  "authorityScore" INTEGER NOT NULL,
  "citationScore" INTEGER NOT NULL,
  "mentioned" BOOLEAN NOT NULL DEFAULT false,
  "reasons" JSONB NOT NULL DEFAULT '[]',
  "missing" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "SimulationResult_taskId_key" ON "SimulationResult"("taskId");
CREATE INDEX IF NOT EXISTS "SimulationResult_taskId_idx" ON "SimulationResult"("taskId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'GrowthEventType') THEN
    CREATE TYPE "GrowthEventType" AS ENUM ('SCAN', 'ENTITY', 'SIMULATION', 'VISIBILITY', 'OPTIMIZATION', 'AI_SEARCH');
    CREATE CAST ("GrowthEventType" AS text) WITH INOUT AS IMPLICIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'GrowthTriggerType') THEN
    CREATE TYPE "GrowthTriggerType" AS ENUM ('MANUAL', 'AUTO', 'SCHEDULE', 'API');
    CREATE CAST ("GrowthTriggerType" AS text) WITH INOUT AS IMPLICIT;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "GrowthSnapshot" (
  "id" TEXT PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "campaignId" TEXT,
  "simulationId" TEXT,
  "eventType" "GrowthEventType" NOT NULL,
  "triggerType" "GrowthTriggerType" NOT NULL DEFAULT 'AUTO',
  "sourceId" TEXT NOT NULL,
  "visibilityScore" INTEGER,
  "entityScore" INTEGER,
  "schemaScore" INTEGER,
  "authorityScore" INTEGER,
  "citationScore" INTEGER,
  "overallScore" INTEGER,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "GrowthSnapshot_projectId_idx" ON "GrowthSnapshot"("projectId");
CREATE INDEX IF NOT EXISTS "GrowthSnapshot_campaignId_idx" ON "GrowthSnapshot"("campaignId");
CREATE INDEX IF NOT EXISTS "GrowthSnapshot_simulationId_idx" ON "GrowthSnapshot"("simulationId");
CREATE UNIQUE INDEX IF NOT EXISTS "GrowthSnapshot_projectId_eventType_sourceId_key" ON "GrowthSnapshot"("projectId", "eventType", "sourceId");

-- Foreign keys are added as NOT VALID so existing legacy rows are never deleted
-- and do not block the migration. New writes are still protected.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Session_userId_fkey') THEN
    ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Account_userId_fkey') THEN
    ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Verification_userId_fkey') THEN
    ALTER TABLE "Verification" ADD CONSTRAINT "Verification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PasswordReset_userId_fkey') THEN
    ALTER TABLE "PasswordReset" ADD CONSTRAINT "PasswordReset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Project_userId_fkey') THEN
    ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE NOT VALID;
  END IF;
END $$;

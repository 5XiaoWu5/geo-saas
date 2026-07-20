CREATE TYPE "AISearchProviderType" AS ENUM ('OPENAI', 'GEMINI', 'CLAUDE', 'PERPLEXITY');
CREATE TYPE "AISearchExecutionStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED');
CREATE TYPE "AISearchCitationType" AS ENUM ('OFFICIAL', 'THIRD_PARTY');

CREATE TABLE "AISearchProviderConfig" ("id" TEXT NOT NULL, "projectId" TEXT NOT NULL, "provider" "AISearchProviderType" NOT NULL, "enabled" BOOLEAN NOT NULL DEFAULT false, "apiKeyReference" TEXT, "model" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "AISearchProviderConfig_pkey" PRIMARY KEY ("id"));
CREATE TABLE "AISearchMonitor" ("id" TEXT NOT NULL, "projectId" TEXT NOT NULL, "name" TEXT NOT NULL, "enabled" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "AISearchMonitor_pkey" PRIMARY KEY ("id"));
CREATE TABLE "AISearchQuery" ("id" TEXT NOT NULL, "projectId" TEXT NOT NULL, "monitorId" TEXT, "query" TEXT NOT NULL, "targetEntity" TEXT NOT NULL, "industry" TEXT NOT NULL, "intent" "AISearchIntent" NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "AISearchQuery_pkey" PRIMARY KEY ("id"));
CREATE TABLE "AISearchResult" ("id" TEXT NOT NULL, "projectId" TEXT NOT NULL, "queryId" TEXT NOT NULL, "provider" "AISearchProviderType" NOT NULL, "status" "AISearchExecutionStatus" NOT NULL DEFAULT 'PENDING', "providerRequestId" TEXT, "rawResponse" TEXT, "mentioned" BOOLEAN, "rankPosition" INTEGER, "productMentions" JSONB NOT NULL DEFAULT '[]', "competitorBrands" JSONB NOT NULL DEFAULT '[]', "errorCode" TEXT, "durationMs" INTEGER, "attemptCount" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "completedAt" TIMESTAMP(3), CONSTRAINT "AISearchResult_pkey" PRIMARY KEY ("id"));
CREATE TABLE "AISearchCitation" ("id" TEXT NOT NULL, "projectId" TEXT NOT NULL, "resultId" TEXT NOT NULL, "url" TEXT NOT NULL, "domain" TEXT NOT NULL, "citationType" "AISearchCitationType" NOT NULL, "position" INTEGER, "citationCount" INTEGER NOT NULL DEFAULT 1, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "AISearchCitation_pkey" PRIMARY KEY ("id"));

CREATE UNIQUE INDEX "AISearchProviderConfig_projectId_provider_key" ON "AISearchProviderConfig"("projectId", "provider");
CREATE INDEX "AISearchProviderConfig_projectId_enabled_idx" ON "AISearchProviderConfig"("projectId", "enabled");
CREATE INDEX "AISearchMonitor_projectId_enabled_idx" ON "AISearchMonitor"("projectId", "enabled");
CREATE INDEX "AISearchQuery_projectId_createdAt_idx" ON "AISearchQuery"("projectId", "createdAt");
CREATE INDEX "AISearchQuery_monitorId_idx" ON "AISearchQuery"("monitorId");
CREATE INDEX "AISearchResult_projectId_provider_createdAt_idx" ON "AISearchResult"("projectId", "provider", "createdAt");
CREATE INDEX "AISearchResult_queryId_status_idx" ON "AISearchResult"("queryId", "status");
CREATE UNIQUE INDEX "AISearchCitation_resultId_url_key" ON "AISearchCitation"("resultId", "url");
CREATE INDEX "AISearchCitation_projectId_domain_createdAt_idx" ON "AISearchCitation"("projectId", "domain", "createdAt");

ALTER TABLE "AISearchProviderConfig" ADD CONSTRAINT "AISearchProviderConfig_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AISearchMonitor" ADD CONSTRAINT "AISearchMonitor_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AISearchQuery" ADD CONSTRAINT "AISearchQuery_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AISearchQuery" ADD CONSTRAINT "AISearchQuery_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "AISearchMonitor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AISearchResult" ADD CONSTRAINT "AISearchResult_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AISearchResult" ADD CONSTRAINT "AISearchResult_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "AISearchQuery"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AISearchCitation" ADD CONSTRAINT "AISearchCitation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AISearchCitation" ADD CONSTRAINT "AISearchCitation_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "AISearchResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

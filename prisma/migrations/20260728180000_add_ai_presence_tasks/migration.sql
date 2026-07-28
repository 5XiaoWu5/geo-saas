CREATE TYPE "AIPresenceTaskType" AS ENUM (
  'CHECK_DISCOVERABILITY',
  'FIX_ROBOTS',
  'CREATE_SITEMAP',
  'SUBMIT_SITEMAP',
  'CREATE_BUSINESS_PROFILE',
  'SUBMIT_PRODUCT_FEED',
  'ADD_ORGANIZATION_SCHEMA',
  'ADD_PRODUCT_SCHEMA',
  'CREATE_CONTACT_PAGE',
  'FIX_COMPANY_INFORMATION',
  'ADD_TRUSTED_SOURCES',
  'VERIFY_CRAWLING',
  'VERIFY_INDEXING',
  'VERIFY_AI_MENTION',
  'VERIFY_CITATION'
);

CREATE TYPE "AIPresencePlatform" AS ENUM (
  'WEBSITE',
  'OPENAI',
  'ANTHROPIC',
  'GOOGLE_SEARCH_CONSOLE',
  'GOOGLE_BUSINESS_PROFILE',
  'GOOGLE_MERCHANT_CENTER',
  'BING_WEBMASTER_TOOLS',
  'INDEXNOW',
  'AI_SEARCH'
);

CREATE TYPE "AIPresenceStatus" AS ENUM (
  'NOT_STARTED',
  'NEEDS_ATTENTION',
  'READY',
  'SUBMITTED',
  'CRAWLED',
  'INDEXED',
  'MENTIONED',
  'CITED',
  'UNAVAILABLE',
  'FAILED'
);

CREATE TYPE "AIPresenceEvidenceStatus" AS ENUM (
  'UNVERIFIED',
  'USER_DECLARED',
  'VERIFIED',
  'FAILED'
);

CREATE TABLE "AIPresenceTask" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "taskType" "AIPresenceTaskType" NOT NULL,
  "platform" "AIPresencePlatform" NOT NULL,
  "targetUrl" TEXT,
  "status" "AIPresenceStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "source" TEXT NOT NULL,
  "submittedAt" TIMESTAMP(3),
  "verifiedAt" TIMESTAMP(3),
  "evidenceStatus" "AIPresenceEvidenceStatus" NOT NULL DEFAULT 'UNVERIFIED',
  "evidenceSummary" TEXT NOT NULL DEFAULT '',
  "evidence" JSONB NOT NULL DEFAULT '{}',
  "errorCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AIPresenceTask_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AIPresenceTask_id_projectId_key"
  ON "AIPresenceTask"("id", "projectId");

CREATE INDEX "AIPresenceTask_projectId_taskType_createdAt_idx"
  ON "AIPresenceTask"("projectId", "taskType", "createdAt");

CREATE INDEX "AIPresenceTask_projectId_platform_status_idx"
  ON "AIPresenceTask"("projectId", "platform", "status");

ALTER TABLE "AIPresenceTask"
  ADD CONSTRAINT "AIPresenceTask_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

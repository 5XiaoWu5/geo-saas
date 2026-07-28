DO $$ BEGIN
  CREATE TYPE "AISearchGatewayProtocol" AS ENUM (
    'OPENAI_COMPATIBLE',
    'ANTHROPIC_COMPATIBLE',
    'GEMINI_COMPATIBLE'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AISearchModelFamily" AS ENUM (
    'OPENAI',
    'GEMINI',
    'CLAUDE',
    'PERPLEXITY'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "AISearchGatewayConnection" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "baseUrl" TEXT NOT NULL,
  "protocol" "AISearchGatewayProtocol" NOT NULL DEFAULT 'OPENAI_COMPATIBLE',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "encryptedApiKey" TEXT NOT NULL,
  "apiKeyIv" TEXT NOT NULL,
  "apiKeyAuthTag" TEXT NOT NULL,
  "apiKeyHint" TEXT NOT NULL,
  "secretVersion" INTEGER NOT NULL DEFAULT 1,
  "lastTestStatus" TEXT,
  "lastTestError" TEXT,
  "lastTestedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AISearchGatewayConnection_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AISearchGatewayConnection_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "AISearchGatewayModel" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "modelId" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "family" "AISearchModelFamily" NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "verificationStatus" "AIModelVerificationStatus" NOT NULL DEFAULT 'LISTED_NOT_TESTED',
  "verifiedAt" TIMESTAMP(3),
  "capabilitiesJson" JSONB NOT NULL DEFAULT '{}',
  "compatibilityLevel" "AIProviderCompatibilityLevel" NOT NULL DEFAULT 'NOT_TESTED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AISearchGatewayModel_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AISearchGatewayModel_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AISearchGatewayModel_connectionId_fkey"
    FOREIGN KEY ("connectionId") REFERENCES "AISearchGatewayConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "AISearchGatewayConnection_projectId_name_key"
  ON "AISearchGatewayConnection"("projectId", "name");
CREATE INDEX IF NOT EXISTS "AISearchGatewayConnection_projectId_enabled_idx"
  ON "AISearchGatewayConnection"("projectId", "enabled");
CREATE UNIQUE INDEX IF NOT EXISTS "AISearchGatewayModel_connectionId_modelId_key"
  ON "AISearchGatewayModel"("connectionId", "modelId");
CREATE INDEX IF NOT EXISTS "AISearchGatewayModel_projectId_family_enabled_idx"
  ON "AISearchGatewayModel"("projectId", "family", "enabled");
CREATE INDEX IF NOT EXISTS "AISearchGatewayModel_connectionId_enabled_idx"
  ON "AISearchGatewayModel"("connectionId", "enabled");

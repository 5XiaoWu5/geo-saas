CREATE TYPE "AISearchConnectionType" AS ENUM ('OPENAI_OFFICIAL', 'OPENAI_COMPATIBLE', 'NATIVE');
CREATE TYPE "AIModelVerificationStatus" AS ENUM ('LISTED_NOT_TESTED', 'VERIFYING', 'VERIFIED_AVAILABLE', 'NO_ACCESS', 'MODEL_NOT_FOUND', 'INSUFFICIENT_BALANCE', 'RATE_LIMITED', 'TEMPORARILY_UNAVAILABLE', 'UNSUPPORTED', 'VERIFICATION_FAILED');
CREATE TYPE "AIProviderCompatibilityLevel" AS ENUM ('NOT_TESTED', 'BASIC', 'PARTIAL', 'FULL', 'UNAVAILABLE');
CREATE TYPE "AISearchDetectionSource" AS ENUM ('OFFICIAL_API', 'COMPATIBLE_GATEWAY', 'REAL_PRODUCT_VERIFICATION');

ALTER TABLE "AISearchProviderConfig"
  ADD COLUMN "connectionType" "AISearchConnectionType" NOT NULL DEFAULT 'NATIVE',
  ADD COLUMN "displayName" TEXT,
  ADD COLUMN "baseUrl" TEXT,
  ADD COLUMN "selectedModelId" TEXT,
  ADD COLUMN "modelVerificationStatus" "AIModelVerificationStatus" NOT NULL DEFAULT 'LISTED_NOT_TESTED',
  ADD COLUMN "modelVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "capabilitiesJson" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "compatibilityLevel" "AIProviderCompatibilityLevel" NOT NULL DEFAULT 'NOT_TESTED';

UPDATE "AISearchProviderConfig"
SET
  "connectionType" = CASE WHEN "provider" = 'OPENAI' THEN 'OPENAI_OFFICIAL'::"AISearchConnectionType" ELSE 'NATIVE'::"AISearchConnectionType" END,
  "selectedModelId" = "model",
  "modelVerificationStatus" = CASE
    WHEN "lastTestStatus" = 'SUCCEEDED' THEN 'VERIFIED_AVAILABLE'::"AIModelVerificationStatus"
    ELSE 'LISTED_NOT_TESTED'::"AIModelVerificationStatus"
  END,
  "modelVerifiedAt" = CASE WHEN "lastTestStatus" = 'SUCCEEDED' THEN "lastTestedAt" ELSE NULL END,
  "compatibilityLevel" = CASE
    WHEN "lastTestStatus" = 'SUCCEEDED' THEN 'BASIC'::"AIProviderCompatibilityLevel"
    ELSE 'NOT_TESTED'::"AIProviderCompatibilityLevel"
  END;

ALTER TABLE "AISearchResult"
  ADD COLUMN "detectionSource" "AISearchDetectionSource" NOT NULL DEFAULT 'OFFICIAL_API';

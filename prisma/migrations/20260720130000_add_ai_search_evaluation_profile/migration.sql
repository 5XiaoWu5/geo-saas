CREATE TYPE "AISearchPlatform" AS ENUM ('CHATGPT', 'GEMINI', 'CLAUDE', 'PERPLEXITY');
CREATE TYPE "AISearchIntent" AS ENUM ('BUYING', 'RESEARCH', 'COMPARISON', 'LOCAL_SEARCH', 'TECHNICAL');
CREATE TYPE "AISearchEvaluationStatus" AS ENUM ('AVAILABLE', 'UNAVAILABLE');

CREATE TABLE "SimulationEvaluationProfile" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "simulationResultId" TEXT,
  "query" TEXT NOT NULL,
  "platform" "AISearchPlatform" NOT NULL,
  "industry" TEXT NOT NULL,
  "intent" "AISearchIntent" NOT NULL,
  "targetEntity" TEXT NOT NULL,
  "knowledgeVersion" INTEGER,
  "evaluationStatus" "AISearchEvaluationStatus" NOT NULL,
  "healthScore" INTEGER,
  "recommendationProbability" INTEGER,
  "confidence" INTEGER,
  "signals" JSONB NOT NULL DEFAULT '[]',
  "issues" JSONB NOT NULL DEFAULT '[]',
  "methodVersion" TEXT NOT NULL DEFAULT 'ai-recommendation-rules-v1',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SimulationEvaluationProfile_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SimulationEvaluationProfile_healthScore_check" CHECK ("healthScore" IS NULL OR ("healthScore" >= 0 AND "healthScore" <= 100)),
  CONSTRAINT "SimulationEvaluationProfile_probability_check" CHECK ("recommendationProbability" IS NULL OR ("recommendationProbability" >= 0 AND "recommendationProbability" <= 100)),
  CONSTRAINT "SimulationEvaluationProfile_confidence_check" CHECK ("confidence" IS NULL OR ("confidence" >= 0 AND "confidence" <= 100))
);

ALTER TABLE "SimulationEvaluationProfile" ADD CONSTRAINT "SimulationEvaluationProfile_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SimulationEvaluationProfile" ADD CONSTRAINT "SimulationEvaluationProfile_simulationResultId_fkey" FOREIGN KEY ("simulationResultId") REFERENCES "SimulationResult"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "SimulationEvaluationProfile_projectId_createdAt_idx" ON "SimulationEvaluationProfile"("projectId", "createdAt");
CREATE INDEX "SimulationEvaluationProfile_simulationResultId_idx" ON "SimulationEvaluationProfile"("simulationResultId");
CREATE INDEX "SimulationEvaluationProfile_projectId_platform_intent_createdAt_idx" ON "SimulationEvaluationProfile"("projectId", "platform", "intent", "createdAt");

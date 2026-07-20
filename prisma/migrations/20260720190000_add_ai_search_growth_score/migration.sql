CREATE TABLE "AISearchGrowthScore" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "visibilityScore" INTEGER,
    "citationScore" INTEGER,
    "knowledgeScore" INTEGER,
    "authorityScore" INTEGER,
    "competitionScore" INTEGER,
    "overallScore" INTEGER NOT NULL,
    "confidence" INTEGER NOT NULL,
    "methodVersion" TEXT NOT NULL DEFAULT 'ai-growth-score-v1',
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AISearchGrowthScore_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AISearchGrowthScore_projectId_calculatedAt_idx"
ON "AISearchGrowthScore"("projectId", "calculatedAt");

ALTER TABLE "AISearchGrowthScore"
ADD CONSTRAINT "AISearchGrowthScore_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

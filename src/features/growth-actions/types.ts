export const ACTION_STATUSES = ["TODO", "IN_PROGRESS", "COMPLETED", "VERIFIED"] as const;
export type GrowthActionStatus = (typeof ACTION_STATUSES)[number];
export type GrowthActionCategory = "SEO" | "GEO" | "AI_SEARCH" | "KNOWLEDGE" | "COMPETITOR";
export type GrowthActionLevel = "HIGH" | "MEDIUM" | "LOW";

export type GrowthActionCandidate = {
  sourceKey: string;
  sourceType: string;
  opportunityId: string | null;
  optimizationTaskId: string | null;
  title: string;
  description: string;
  category: GrowthActionCategory;
  priority: GrowthActionLevel;
  impact: GrowthActionLevel;
};

export type GrowthActionView = GrowthActionCandidate & {
  id: string;
  projectId: string;
  status: GrowthActionStatus;
  createdBy: string;
  completedAt: string | null;
  verifiedAt: string | null;
  createdAt: string;
};

export type ActionGenerationResult = {
  status: "available" | "unavailable";
  createdCount: number;
  existingCount: number;
  actions: GrowthActionView[];
};

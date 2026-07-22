import type { GrowthActionCategory, GrowthActionLevel, GrowthActionView } from "@/features/growth-actions/types";

export const AGENT_STATUSES = ["TODO", "IN_PROGRESS", "COMPLETED", "VERIFIED"] as const;
export type GrowthAgentTaskStatus = (typeof AGENT_STATUSES)[number];
export type AgentPlanStep = { order: number; title: string; instruction: string; target: string; evidenceRequired: string };
export type AgentVerificationCheck = { metric: string; sourceType: string; successCriteria: string };
export type AgentExpectedImpact = { status: "directional" | "unavailable"; metrics: Array<{ metric: string; direction: "increase"; estimatedDelta: null; evidenceStatus: "unavailable" }> };

export type GrowthAgentCandidate = {
  actionId: string;
  title: string;
  description: string;
  category: GrowthActionCategory;
  priority: GrowthActionLevel;
  confidence: number;
  expectedImpact: AgentExpectedImpact;
  executionPlan: AgentPlanStep[];
  verificationPlan: AgentVerificationCheck[];
};

export type GrowthAgentTaskView = GrowthAgentCandidate & {
  id: string;
  projectId: string;
  status: GrowthAgentTaskStatus;
  generatedAt: string;
  completedAt: string | null;
  createdAt: string;
  action: Pick<GrowthActionView, "id" | "title" | "sourceType" | "optimizationTaskId" | "status">;
};

export type GrowthAgentOverview = {
  projectId: string;
  tasks: GrowthAgentTaskView[];
  summary: { total: number; completed: number; verified: number; completionRate: number; suggestionCount: number; expectedMetricCount: number; expectedGrowthValue: "unavailable" };
};

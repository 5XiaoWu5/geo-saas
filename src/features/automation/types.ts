export const AUTOMATION_MODES = ["SAFE", "STANDARD", "EXPERT"] as const;
export type AutomationMode = (typeof AUTOMATION_MODES)[number];
export type AutomationRunStatus = "PREVIEW" | "AWAITING_APPROVAL" | "RUNNING" | "PAUSED" | "COMPLETED" | "FAILED" | "CANCELLED";
export type AutomationRiskLevel = "SAFE" | "INTERNAL_WRITE" | "EXTERNAL_COST" | "EXTERNAL_WRITE";
export type AutomationStepStatus = "PENDING" | "AWAITING_APPROVAL" | "RUNNING" | "COMPLETED" | "FAILED" | "SKIPPED" | "CANCELLED";

export type EvidenceMetric = {
  status: "available" | "unavailable";
  value: number | null;
  sourceId: string | null;
  sourceType: string;
  capturedAt: string;
};

export type AutomationEvidenceSnapshot = {
  capturedAt: string;
  metrics: {
    seoHealth: EvidenceMetric;
    aiVisibility: EvidenceMetric;
    knowledgeCompleteness: EvidenceMetric;
    citationCount: EvidenceMetric;
    entityAuthority: EvidenceMetric;
  };
  records: {
    growthActions: number;
    growthAgentTasks: number;
    optimizationTasks: number;
    growthReports: number;
  };
};

export type AutomationStepView = {
  id: string;
  runId: string;
  projectId: string;
  sequence: number;
  stepKey: string;
  stepType: string;
  riskLevel: AutomationRiskLevel;
  status: AutomationStepStatus;
  title: string;
  activityMessage: string;
  inputEvidence: Record<string, unknown>;
  outputEvidence: Record<string, unknown> | null;
  approvalSummary: Record<string, unknown> | null;
  approvedBy: string | null;
  approvedAt: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  createdAt: string;
  updatedAt: string;
};

export type AutomationRunView = {
  id: string;
  projectId: string;
  createdBy: string;
  mode: AutomationMode;
  status: AutomationRunStatus;
  progress: number;
  currentStepKey: string | null;
  beforeSnapshot: AutomationEvidenceSnapshot;
  afterSnapshot: AutomationEvidenceSnapshot | null;
  summary: Record<string, unknown> | null;
  errorCode: string | null;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  steps: AutomationStepView[];
};

export type AutomationStepDefinition = {
  stepKey: string;
  stepType: string;
  riskLevel: AutomationRiskLevel;
  status?: AutomationStepStatus;
  title: string;
  activityMessage: string;
  inputEvidence?: Record<string, unknown>;
  approvalSummary?: Record<string, unknown>;
};

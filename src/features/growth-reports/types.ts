export const GROWTH_REPORT_METHOD_VERSION = "growth-report-v1";
export type GrowthReportStatus = "PROCESSING" | "COMPLETED" | "FAILED";
export type EvidenceStatus = "verified" | "partial" | "unavailable";

export type SnapshotModule<T = Record<string, unknown>> = {
  status: "available" | "unavailable";
  sourceId: string[];
  sourceType: string[];
  generatedAt: string;
  evidenceStatus: EvidenceStatus;
  data?: T;
};

export type ExecutiveSummary = {
  status: "available" | "unavailable";
  currentState: string[];
  priorities: string[];
};

export type GrowthReportSnapshot = {
  reportMeta: {
    projectId: string;
    projectName: string;
    domain: string;
    version: number;
    generatedBy: string;
    generatedAt: string;
    dataVersion: string;
    methodVersion: string;
    confidence: number;
    status: GrowthReportStatus;
    executiveSummary: ExecutiveSummary;
    failureReason?: string;
  };
  seoSnapshot: SnapshotModule;
  geoSnapshot: SnapshotModule;
  aiSearchSnapshot: SnapshotModule;
  knowledgeSnapshot: SnapshotModule;
  competitorSnapshot: SnapshotModule;
  optimizationSnapshot: SnapshotModule;
  insightSnapshot: SnapshotModule;
  roadmapSnapshot: SnapshotModule;
};

export type GrowthReportListItem = {
  id: string;
  projectId: string;
  version: number;
  generatedBy: string;
  status: GrowthReportStatus;
  dataVersion: string;
  methodVersion: string;
  confidence: number | null;
  createdAt: string;
};

export type GrowthReportDetail = GrowthReportListItem & {
  snapshot: GrowthReportSnapshot;
  htmlPreview: string;
};

export type GrowthReportEvidence = {
  project: Record<string, unknown>;
  scan: Record<string, unknown> | null;
  analysis: Record<string, unknown> | null;
  entity: Record<string, unknown> | null;
  visibilityChecks: Record<string, unknown>[];
  visibilityCitations: Record<string, unknown>[];
  aiResults: Record<string, unknown>[];
  aiCitations: Record<string, unknown>[];
  growthScore: Record<string, unknown> | null;
  knowledge: Record<string, unknown> | null;
  knowledgeAssets: Record<string, unknown> | null;
  benchmarkRun: Record<string, unknown> | null;
  benchmarkResults: Record<string, unknown>[];
  optimizationTasks: Record<string, unknown>[];
  insight: Record<string, unknown> | null;
  growthSnapshots: Record<string, unknown>[];
};

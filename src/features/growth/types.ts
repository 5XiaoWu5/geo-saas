import type { GeoCampaignProject } from "@/features/geo-campaign/types";

export const GROWTH_EVENT_TYPES = ["SCAN", "ENTITY", "SIMULATION", "VISIBILITY", "OPTIMIZATION", "AI_SEARCH"] as const;
export type GrowthEventType = (typeof GROWTH_EVENT_TYPES)[number];

export const GROWTH_TRIGGER_TYPES = ["MANUAL", "AUTO", "SCHEDULE", "API"] as const;
export type GrowthTriggerType = (typeof GROWTH_TRIGGER_TYPES)[number];

export const GROWTH_RANGES = ["7d", "30d", "90d", "all"] as const;
export type GrowthRange = (typeof GROWTH_RANGES)[number];

export const GROWTH_METRICS = ["overallScore", "visibilityScore", "entityScore", "schemaScore", "authorityScore", "citationScore"] as const;
export type GrowthMetricKey = (typeof GROWTH_METRICS)[number];

export type GrowthSnapshot = {
  id: string;
  projectId: string;
  campaignId: string | null;
  simulationId: string | null;
  eventType: GrowthEventType;
  triggerType: GrowthTriggerType;
  sourceId: string;
  visibilityScore: number | null;
  entityScore: number | null;
  schemaScore: number | null;
  authorityScore: number | null;
  citationScore: number | null;
  overallScore: number | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type GrowthMetrics = Pick<GrowthSnapshot, GrowthMetricKey>;

export type GrowthMetricDelta = {
  key: GrowthMetricKey;
  first: number | null;
  latest: number | null;
  change: number | null;
};

export type GrowthTrend = {
  range: GrowthRange;
  points: GrowthSnapshot[];
  deltas: GrowthMetricDelta[];
};

export type CampaignGrowthImpact = {
  campaignId: string;
  campaignName: string;
  snapshotCount: number;
  visibilityChange: number | null;
  overallChange: number | null;
};

export type GrowthWorkspaceProject = GeoCampaignProject & {
  snapshotCount: number;
  latestScore: number | null;
  latestSnapshotAt: string | null;
};

export type GrowthWorkspaceResponse = {
  projects: GrowthWorkspaceProject[];
  selectedProjectId: string | null;
  snapshots: GrowthSnapshot[];
  trend: GrowthTrend;
  campaignImpact: CampaignGrowthImpact[];
  error?: string;
};

export type CreateGrowthSnapshotInput = {
  projectId: string;
  eventType: GrowthEventType;
  sourceId: string;
  triggerType?: GrowthTriggerType;
};

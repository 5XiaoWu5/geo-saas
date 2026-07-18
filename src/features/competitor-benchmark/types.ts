export const COMPETITOR_STATUSES = ["ACTIVE", "PAUSED", "ARCHIVED"] as const;
export type CompetitorStatus = (typeof COMPETITOR_STATUSES)[number];

export const SIMULATION_TARGET_TYPES = ["OWN", "COMPETITOR"] as const;
export type SimulationTargetType = (typeof SIMULATION_TARGET_TYPES)[number];

export const VISIBILITY_ENTITY_TYPES = ["OWN", "COMPETITOR", "UNKNOWN"] as const;
export type VisibilityEntityType = (typeof VISIBILITY_ENTITY_TYPES)[number];

export type CompetitorProfile = {
  id: string;
  projectId: string;
  name: string;
  domain: string;
  normalizedDomain: string;
  industry: string;
  region: string;
  status: CompetitorStatus;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type CompetitorCreateInput = {
  projectId: string;
  name: string;
  domain: string;
  industry?: string;
  region?: string;
  metadata?: Record<string, unknown>;
};

export type CompetitorUpdateInput = Partial<Pick<CompetitorProfile, "name" | "domain" | "industry" | "region" | "status" | "metadata">>;

export type CompetitorSnapshot = {
  id: string;
  competitorId: string;
  overallScore: number | null;
  visibilityScore: number | null;
  entityScore: number | null;
  schemaScore: number | null;
  authorityScore: number | null;
  citationScore: number | null;
  methodVersion: string;
  sourceId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type CompetitorSnapshotInput = {
  projectId: string;
  competitorId: string;
  overallScore?: number | null;
  visibilityScore?: number | null;
  entityScore?: number | null;
  schemaScore?: number | null;
  authorityScore?: number | null;
  citationScore?: number | null;
  methodVersion: string;
  sourceId: string;
  metadata?: Record<string, unknown>;
};

export const BENCHMARK_METRICS = ["overallScore", "visibilityScore", "entityScore", "schemaScore", "authorityScore", "citationScore"] as const;
export type BenchmarkMetricKey = (typeof BENCHMARK_METRICS)[number];

export type BenchmarkGap = {
  metric: BenchmarkMetricKey;
  available: boolean;
  ownScore: number | null;
  competitorScore: number | null;
  difference: number | null;
};

export type CompetitorEntityEvidence = {
  targetType: SimulationTargetType;
  targetId: string;
  projectId: string;
  name: string;
  domain: string;
  industry: string;
  region: string;
  available: boolean;
  missingFields: string[];
  sourceType: "EntityProfile" | "CompetitorProfile" | "Project";
  sourceId: string;
};

export type SimulationTargetEvidence = {
  targetType: SimulationTargetType;
  competitorId: string | null;
  entity: CompetitorEntityEvidence | null;
  snapshot: CompetitorSnapshot | null;
  available: boolean;
  missingSources: string[];
};

export type VisibilityMention = {
  id: string;
  checkId: string;
  competitorId: string | null;
  entityType: VisibilityEntityType;
  brandName: string;
  normalizedName: string;
  position: number | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type VisibilityCitation = {
  id: string;
  checkId: string;
  mentionId: string | null;
  url: string;
  domain: string;
  position: number | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type VisibilityMentionInput = {
  checkId: string;
  competitorId?: string | null;
  entityType: VisibilityEntityType;
  brandName: string;
  position?: number | null;
  metadata?: Record<string, unknown>;
};

export type VisibilityCitationInput = {
  checkId: string;
  mentionId?: string | null;
  url: string;
  position?: number | null;
  metadata?: Record<string, unknown>;
};

export type CompetitorWorkspaceResponse = {
  projectId: string;
  competitors: CompetitorProfile[];
  error?: string;
};

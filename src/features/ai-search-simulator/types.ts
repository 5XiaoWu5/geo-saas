import type { GeoAnalysis } from "@/features/geo-analysis/types";
import type { GeoBrainAnalysis } from "@/features/geo-brain/types";
import type { GeoCampaign, GeoCampaignProject, GeoQuery } from "@/features/geo-campaign/types";
import type { EntityProfile } from "@/features/entity/types";
import type { VisibilityAnalytics } from "@/features/visibility/types";
import type { WebsiteScan } from "@/features/website-crawl/types";
import type { SimulationTargetType } from "@/features/competitor-benchmark/types";
import type { getKnowledgeEvidenceForSimulation } from "@/features/knowledge";

export const SIMULATION_PROVIDERS = ["ChatGPT", "Gemini", "Claude", "Perplexity", "DeepSeek", "Doubao"] as const;
export type SimulationProviderName = (typeof SIMULATION_PROVIDERS)[number];

export const SIMULATION_STATUSES = ["PENDING", "RUNNING", "COMPLETED", "FAILED"] as const;
export type SimulationStatus = (typeof SIMULATION_STATUSES)[number];

export const SIMULATION_SIGNAL_CODES = [
  "faq_coverage",
  "entity_complete",
  "schema_high",
  "page_structure",
  "visibility_mentions",
  "authority_strong",
  "query_relevance",
  "news_citations",
  "case_pages",
  "external_authority",
  "faq_missing",
  "schema_missing",
  "entity_incomplete",
] as const;
export type SimulationSignalCode = (typeof SIMULATION_SIGNAL_CODES)[number];

export type SimulationTask = {
  id: string;
  projectId: string;
  campaignId: string | null;
  queryId: string | null;
  query: string;
  provider: SimulationProviderName;
  targetType: SimulationTargetType;
  competitorId: string | null;
  status: SimulationStatus;
  createdAt: string;
  updatedAt: string;
};

export type SimulationResult = {
  id: string;
  taskId: string;
  probability: number;
  ranking: number | null;
  confidence: number;
  entityScore: number;
  schemaScore: number;
  authorityScore: number;
  citationScore: number;
  mentioned: boolean;
  reasons: SimulationSignalCode[];
  missing: SimulationSignalCode[];
  createdAt: string;
};

export type SimulationRecord = SimulationTask & {
  result: SimulationResult | null;
  trend: number | null;
};

export type SimulationEvidence = {
  project: GeoCampaignProject;
  scan: WebsiteScan;
  analysis: GeoAnalysis;
  brainAnalysis: GeoBrainAnalysis | null;
  entityProfile: EntityProfile | null;
  visibility: VisibilityAnalytics;
  campaign: GeoCampaign | null;
  geoQuery: GeoQuery | null;
  knowledgeEvidence: Awaited<ReturnType<typeof getKnowledgeEvidenceForSimulation>>;
};

export type SimulationInput = {
  projectId: string;
  campaignId?: string | null;
  queryId?: string | null;
  query: string;
  provider: SimulationProviderName;
  evidence: SimulationEvidence;
};

export type SimulationResultDraft = Omit<SimulationResult, "id" | "taskId" | "createdAt">;

export type RunSimulationInput = {
  projectId: string;
  campaignId?: string | null;
  queryId?: string | null;
  query: string;
  providers: SimulationProviderName[];
  targetType?: SimulationTargetType;
  competitorId?: string | null;
};

export type SimulatorWorkspaceResponse = {
  projects: GeoCampaignProject[];
  campaigns: GeoCampaign[];
  queries: GeoQuery[];
  selectedProjectId: string | null;
  selectedCampaignId: string | null;
  selectedQueryId: string | null;
  history: SimulationRecord[];
  latest: SimulationRecord[];
  error?: string;
};

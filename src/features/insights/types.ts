import type { OptimizationTask } from "@/features/optimization/types";
import type { KnowledgeGap } from "@/features/knowledge/types";

export const INSIGHT_SIGNAL_KEYS = [
  "entity_strength",
  "schema_strength",
  "authority_strength",
  "citation_strength",
  "visibility_strength",
  "content_strength",
  "faq_coverage",
  "campaign_relevance",
  "entity_gap",
  "schema_gap",
  "authority_gap",
  "citation_gap",
  "visibility_gap",
  "content_gap",
  "faq_gap",
  "news_citation_gap",
  "case_study_gap",
  "external_authority_gap",
] as const;

export type InsightSignalKey = (typeof INSIGHT_SIGNAL_KEYS)[number];
export type InsightSignalKind = "positive" | "negative" | "missing";
export type InsightSourceType = "SimulationResult" | "GrowthSnapshot" | "GeoAnalysis" | "EntityProfile" | "VisibilityCheck" | "GeoCampaign";
export type InsightTargetModule = "analyzer" | "entity" | "visibility" | "campaigns" | "simulator" | "optimization";

export type InsightSignal = {
  signalKey: InsightSignalKey;
  kind: InsightSignalKind;
  value: number;
  sourceType: InsightSourceType;
  sourceId: string;
  confidence: number;
  targetModule: InsightTargetModule;
  available: true;
};

export type InsightUnavailableSource = {
  sourceType: InsightSourceType;
  available: false;
};

export type InsightScoreAnchor = {
  score: number;
  sourceType: "SimulationResult" | "GrowthSnapshot" | "GeoAnalysis";
  sourceId: string;
  createdAt: string;
};

export type InsightRecommendation = {
  signalKey: InsightSignalKey;
  issueId: string;
  targetModule: "optimization";
  existingTask: OptimizationTask | null;
  deepLink: string;
};

export type ProjectInsight = {
  projectId: string;
  projectName: string;
  websiteUrl: string;
  status: "available" | "unavailable";
  anchor: InsightScoreAnchor | null;
  score: number | null;
  confidence: number | null;
  positiveSignals: InsightSignal[];
  negativeSignals: InsightSignal[];
  missingSignals: InsightSignal[];
  unavailableSources: InsightUnavailableSource[];
  recommendations: InsightRecommendation[];
  knowledgeInsight: {
    type: "KNOWLEDGE_GAP";
    profileId: string;
    confidence: number | null;
    gaps: KnowledgeGap[];
    targetModule: "knowledge";
    deepLink: string;
  } | null;
};

export type InsightsResponse = {
  projects: Array<{ id: string; name: string; websiteUrl: string }>;
  selectedProjectId: string | null;
  insights: ProjectInsight[];
  error?: string;
};

export type CreateInsightTaskResponse = {
  task: OptimizationTask;
  created: boolean;
  deepLink: string;
};

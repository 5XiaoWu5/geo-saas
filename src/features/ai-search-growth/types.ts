import type { AISearchProviderType } from "@/features/real-ai-search/types";

export type EvidenceStatus = "available" | "unavailable";
export type EvidenceMetric = { status: EvidenceStatus; value: number | null; sourceIds: string[] };

export type AISearchGrowthScoreView = {
  id: string | null;
  status: EvidenceStatus;
  visibilityScore: number | null;
  citationScore: number | null;
  knowledgeScore: number | null;
  authorityScore: number | null;
  competitionScore: number | null;
  overallScore: number | null;
  confidence: number;
  methodVersion: "ai-growth-score-v1";
  calculatedAt: string | null;
  sources: Record<"visibility" | "citation" | "knowledge" | "authority" | "competition", string[]>;
};

export type AISearchGrowthScoreInput = {
  visibility: EvidenceMetric;
  citation: EvidenceMetric;
  knowledge: EvidenceMetric;
  authority: EvidenceMetric;
  competition: EvidenceMetric;
};

export type RecommendationExplanationType = "NO_REAL_AI_VISIBILITY" | "LACK_CUSTOMER_PROOF" | "LOW_ENTITY_AUTHORITY" | "LACK_CITATION_EVIDENCE" | "LOW_PRODUCT_CLARITY" | "BENCHMARK_DISADVANTAGE";
export type RecommendationExplanationReason = {
  type: RecommendationExplanationType;
  severity: "HIGH" | "MEDIUM" | "LOW";
  description: string;
  recommendation: string;
  sources: Array<{ sourceType: string; sourceId: string; label: string }>;
};
export type RecommendationExplanation = { status: EvidenceStatus; reasons: RecommendationExplanationReason[]; unavailableReason: string | null };

export type RecommendationExplanationInput = {
  realSearch: null | { successfulCount: number; mentionCount: number; citationCount: number; sourceIds: string[] };
  knowledge: null | { baseId: string; profileId: string | null; missingTypes: string[]; customerProofCount: number; productCount: number };
  entity: null | { id: string; authorityScore: number };
  benchmark: null | { runId: string; ownResultId: string; strongestResultId: string; gap: number };
};

export type ProviderVisibilitySummary = {
  provider: AISearchProviderType;
  status: EvidenceStatus;
  successfulChecks: number;
  mentionCount: number | null;
  citationCount: number | null;
  averageRank: number | null;
};

export type GrowthTrendPoint = { id: string; provider: AISearchProviderType; mentioned: boolean; rankPosition: number | null; citationCount: number; completedAt: string };
export type CompetitionMetric = { status: EvidenceStatus; value: number | null; unit: "percent" | "count" | "score" };
export type CompetitionRow = { id: string; name: string; targetType: "OWN" | "COMPETITOR"; appearanceRate: CompetitionMetric; citationCount: CompetitionMetric; productCoverage: CompetitionMetric; knowledgeCompleteness: CompetitionMetric; recommendationProbability: CompetitionMetric };
export type RoadmapTask = { id: string; issueId: string; title: string; source: string; priority: "HIGH" | "MEDIUM" | "LOW"; impact: string; reason: string; recommendation: string; status: string };

export type AISearchGrowthResponse = {
  project: { id: string; name: string; domain: string };
  overview: { status: EvidenceStatus; totalSuccessfulChecks: number; brandMentions: number | null; citations: number | null; averageRank: number | null; providers: ProviderVisibilitySummary[] };
  trend: GrowthTrendPoint[];
  competition: { status: EvidenceStatus; rows: CompetitionRow[] };
  explanation: RecommendationExplanation;
  score: AISearchGrowthScoreView;
  roadmap: RoadmapTask[];
  relationship: { websiteScanAvailable: boolean; seoAnalysisAvailable: boolean; knowledgeProfileAvailable: boolean; realAISearchAvailable: boolean };
};

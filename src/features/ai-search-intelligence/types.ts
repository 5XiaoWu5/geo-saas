import type { GeoIssueCategory, GeoIssueSeverity } from "@/features/geo-analysis/types";

export const AI_SEARCH_PLATFORMS = ["CHATGPT", "GEMINI", "CLAUDE", "PERPLEXITY"] as const;
export const AI_SEARCH_INTENTS = ["BUYING", "RESEARCH", "COMPARISON", "LOCAL_SEARCH", "TECHNICAL"] as const;
export const AI_RECOMMENDATION_SIGNAL_TYPES = ["ENTITY_TRUST", "KNOWLEDGE_COMPLETENESS", "PRODUCT_CLARITY", "CUSTOMER_PROOF", "TECHNICAL_AUTHORITY", "CITATION_POTENTIAL", "COMPETITIVE_GAP"] as const;

export type AISearchPlatform = (typeof AI_SEARCH_PLATFORMS)[number];
export type AISearchIntent = (typeof AI_SEARCH_INTENTS)[number];
export type AIRecommendationSignalType = (typeof AI_RECOMMENDATION_SIGNAL_TYPES)[number];
export type AISearchEvaluationStatus = "AVAILABLE" | "UNAVAILABLE";
export type AIRecommendationIssueType = "LOW_ENTITY_AUTHORITY" | "INCOMPLETE_KNOWLEDGE" | "LOW_PRODUCT_CLARITY" | "INSUFFICIENT_PROOF" | "LOW_TECHNICAL_AUTHORITY" | "LOW_CITATION_POTENTIAL" | "COMPETITIVE_DISADVANTAGE";

export type AIRecommendationSource = {
  sourceType: "EntityProfile" | "CompanyKnowledgeBase" | "CompanyKnowledgeProfile" | "ProductEntity" | "CustomerCase" | "TechnicalDocument" | "VisibilityCheck" | "VisibilityCitation" | "BenchmarkRun" | "BenchmarkResult" | "SimulationResult";
  sourceId: string;
  label: string;
};

export type AIRecommendationSignal = {
  type: AIRecommendationSignalType;
  label: string;
  status: "available" | "unavailable";
  score: number | null;
  explanation: string;
  evidenceCount: number;
  sources: AIRecommendationSource[];
};

export type AIRecommendationIssue = {
  type: AIRecommendationIssueType;
  severity: "HIGH" | "MEDIUM" | "LOW";
  reason: string;
  recommendation: string;
  signalType: AIRecommendationSignalType;
  sources: AIRecommendationSource[];
  optimizationIssueId: string;
  opportunitySource: "AI_RECOMMENDATION_GAP";
  issueCategory: GeoIssueCategory;
  optimizationSeverity: GeoIssueSeverity;
};

export type AIRecommendationEvidence = {
  entity: null | { id: string; brandName: string; industry: string; region: string; description: string; services: string[]; products: string[]; advantages: string[] };
  knowledge: null | { baseId: string; profileId: string | null; version: number; completenessScore: number | null; missingTypes: string[]; certifications: number; faqTopics: number };
  products: Array<{ id: string; name: string; category: string; description: string; features: string[]; applications: string[]; targetCustomers: string[] }>;
  cases: Array<{ id: string; customerName: string; industry: string; problem: string; solution: string; result: string; metrics: Record<string, unknown> }>;
  technicalDocuments: Array<{ id: string; title: string; type: string; summary: string; technicalFields: Record<string, unknown> }>;
  visibility: { checks: Array<{ id: string; score: number; cited: boolean; citationIds: string[] }> };
  benchmark: null | { runId: string; own: { id: string; overallScore: number } | null; competitors: Array<{ id: string; overallScore: number }> };
  simulation: null | { id: string; query: string; platform: AISearchPlatform; probability: number; confidence: number };
};

export type AIRecommendationAnalysis = {
  status: "available" | "unavailable";
  healthScore: number | null;
  confidence: number | null;
  recommendationProbability: number | null;
  signals: AIRecommendationSignal[];
  issues: AIRecommendationIssue[];
  unavailableReason: string | null;
  methodVersion: "ai-recommendation-rules-v1";
};

export type SimulationEvaluationProfile = {
  id: string;
  projectId: string;
  simulationResultId: string | null;
  query: string;
  platform: AISearchPlatform;
  industry: string;
  intent: AISearchIntent;
  targetEntity: string;
  knowledgeVersion: number | null;
  evaluationStatus: AISearchEvaluationStatus;
  healthScore: number | null;
  recommendationProbability: number | null;
  confidence: number | null;
  signals: AIRecommendationSignal[];
  issues: AIRecommendationIssue[];
  methodVersion: string;
  createdAt: string;
};

export type AISearchIntelligenceResponse = {
  project: { id: string; name: string; industry: string };
  context: { query: string; platform: AISearchPlatform; intent: AISearchIntent; targetEntity: string; knowledgeVersion: number | null };
  analysis: AIRecommendationAnalysis;
  latestEvaluation: SimulationEvaluationProfile | null;
};

export type CreateAISearchEvaluationInput = { projectId: string; query: string; platform: AISearchPlatform; intent: AISearchIntent };

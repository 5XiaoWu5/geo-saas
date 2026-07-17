import type { EntityAttribute, EntityProfile } from "@/features/entity/types";
import type { GeoAnalysis, GeoIssue } from "@/features/geo-analysis/types";
import type { WebsiteScan } from "@/features/website-crawl/types";
import type { Project } from "@/types/project";

export type GeoBrainProblemType = "entity" | "content" | "schema" | "authority" | "citation";
export type GeoBrainSeverity = "high" | "medium" | "low";
export type GeoBrainPriority = "high" | "medium" | "low";

export type GeoBrainProblem = {
  type: GeoBrainProblemType;
  severity: GeoBrainSeverity;
  description: string;
};

export type GeoBrainRecommendation = {
  priority: GeoBrainPriority;
  action: string;
  rationale: string;
};

export type GeoBrainScoreDetails = {
  entityScore: number;
  contentScore: number;
  schemaScore: number;
  authorityScore: number;
  citationScore: number;
};

export type GeoBrainScore = GeoBrainScoreDetails & {
  geoScore: number;
};

export type GeoBrainAnalyzerResult = {
  score: number;
  insights: string[];
  problems: GeoBrainProblem[];
  recommendations: GeoBrainRecommendation[];
};

export type GeoBrainInput = {
  url: string;
  crawlData: WebsiteScan | null;
  entityData: {
    profile: EntityProfile | null;
    attributes: EntityAttribute[];
  };
  inventoryData: {
    latestScan: WebsiteScan | null;
    analysis: GeoAnalysis | null;
    issues: GeoIssue[];
  };
  project: Project;
};

export type GeoBrainAnalysisResult = {
  geoScore: number;
  score: GeoBrainScore;
  insights: string[];
  problems: GeoBrainProblem[];
  recommendations: GeoBrainRecommendation[];
  aiSummary: string;
  provider: string;
  model: string;
};

export type GeoBrainAnalysis = {
  id: string;
  projectId: string;
  score: number;
  scoreDetails: GeoBrainScoreDetails;
  insights: string[];
  problems: GeoBrainProblem[];
  recommendations: GeoBrainRecommendation[];
  aiSummary: string;
  provider: string;
  model: string;
  createdAt: string;
  updatedAt: string;
};

import type { GeoAnalysis } from "@/features/geo-analysis/types";
import type { OptimizationTask } from "@/features/optimization/types";
import type { WebsiteScan } from "@/features/website-crawl/types";
import type { Project } from "@/types/project";
import type { KnowledgeGap, KnowledgeProfileItem } from "@/features/knowledge/types";

export type EntityProfile = {
  id: string;
  projectId: string;
  brandName: string;
  industry: string;
  region: string;
  description: string;
  services: string[];
  products: string[];
  advantages: string[];
  createdAt: string;
  updatedAt: string;
};

export type EntityAttribute = {
  id: string;
  entityId: string;
  key: string;
  value: string;
  source: string;
  createdAt: string;
};

export type EntityDimensionKey = "brand" | "business" | "products" | "structured" | "trust";

export type EntityScoreDimension = {
  key: EntityDimensionKey;
  label: string;
  score: number;
  maxScore: number;
  description: string;
};

export type EntityMissingItem = {
  key: string;
  title: string;
  description: string;
  recommendation: string;
  severity: "High" | "Medium" | "Low";
  category: string;
};

export type EntityScore = {
  totalScore: number;
  dimensions: EntityScoreDimension[];
  missingItems: EntityMissingItem[];
};

export type EntityProjectReport = {
  project: Project;
  scan: WebsiteScan | null;
  analysis: GeoAnalysis | null;
  profile: EntityProfile | null;
  attributes: EntityAttribute[];
  score: EntityScore;
  optimizationTasks?: OptimizationTask[];
  knowledgeEnhancement?: {
    profileId: string;
    knowledgeCompleteness: number | null;
    knowledgeConfidence: number | null;
    products: KnowledgeProfileItem[];
    services: KnowledgeProfileItem[];
    advantages: KnowledgeProfileItem[];
    missingKnowledge: KnowledgeGap[];
  } | null;
};

export type EntityResponse = {
  projects: Array<{
    id: string;
    name: string;
    websiteUrl: string;
    industry: string;
    country: string;
    geoScore: number;
    visibilityScore: number;
  }>;
  selectedProjectId: string | null;
  report: EntityProjectReport | null;
  error?: string;
};

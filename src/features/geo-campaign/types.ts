import type { Project } from "@/types/project";
import type { VisibilityAnalytics, VisibilityCheck, VisibilityPrompt, VisibilityTrendPoint } from "@/features/visibility/types";

export const GEO_CAMPAIGN_PLATFORMS = ["ChatGPT", "Claude", "Gemini", "Perplexity", "DeepSeek"] as const;
export type GeoCampaignPlatform = (typeof GEO_CAMPAIGN_PLATFORMS)[number];

export const GEO_CAMPAIGN_CATEGORIES = ["recommendation", "comparison", "solution", "procurement", "brand", "local"] as const;
export type GeoCampaignCategory = (typeof GEO_CAMPAIGN_CATEGORIES)[number];

export const GEO_CAMPAIGN_PRIORITIES = ["high", "medium", "low"] as const;
export type GeoCampaignPriority = (typeof GEO_CAMPAIGN_PRIORITIES)[number];

export const GEO_CAMPAIGN_STATUSES = ["ACTIVE", "PAUSED", "ARCHIVED"] as const;
export type GeoCampaignStatus = (typeof GEO_CAMPAIGN_STATUSES)[number];

export const GEO_QUERY_STATUSES = ["MONITORING", "PAUSED", "COMPLETED"] as const;
export type GeoQueryStatus = (typeof GEO_QUERY_STATUSES)[number];

export type GeoCampaignProject = Pick<Project, "id" | "name" | "websiteUrl" | "industry" | "description" | "geoScore" | "visibilityScore" | "country">;

export type GeoCampaign = {
  id: string;
  projectId: string;
  name: string;
  industry: string;
  businessDescription: string;
  goal: string;
  platforms: GeoCampaignPlatform[];
  queryCount: number;
  status: GeoCampaignStatus;
  createdAt: string;
  updatedAt: string;
};

export type GeoQuery = {
  id: string;
  campaignId: string;
  query: string;
  category: GeoCampaignCategory;
  intent: string;
  priority: GeoCampaignPriority;
  status: GeoQueryStatus;
  createdAt: string;
};

export type GeoCampaignQueryDraft = {
  query: string;
  category: GeoCampaignCategory;
  intent: string;
  priority: GeoCampaignPriority;
};

export type GeoCampaignCluster = {
  category: GeoCampaignCategory;
  label: string;
  intent: string;
  priority: GeoCampaignPriority;
  queryCount: number;
  queryCoverage: number;
  queries: GeoCampaignQueryDraft[];
};

export type GeoCampaignScore = {
  score: number;
  queryCoverage: number;
  visibilityRate: number;
  averageMentionPosition: number | null;
  brandMentions: number;
  totalChecks: number;
  monitoringCoverage: number;
  trendDelta: number;
};

export type GeoCampaignWithRelations = GeoCampaign & {
  queries: GeoQuery[];
  clusters: GeoCampaignCluster[];
  prompts: VisibilityPrompt[];
  checks: VisibilityCheck[];
  latestCheck: VisibilityCheck | null;
  trend: VisibilityTrendPoint[];
  score: GeoCampaignScore;
};

export type GeoCampaignSummary = {
  totalCampaigns: number;
  totalQueries: number;
  totalChecks: number;
  brandMentions: number;
  aiExposureRate: number;
  averageMentionPosition: number | null;
  averageScore: number;
  queryCoverage: number;
  growthDelta: number;
};

export type GeoCampaignWorkspaceResponse = {
  projects: GeoCampaignProject[];
  selectedProjectId: string | null;
  selectedCampaignId: string | null;
  campaigns: GeoCampaignWithRelations[];
  summary: GeoCampaignSummary;
  analytics: VisibilityAnalytics;
};

export type GeoCampaignDetailResponse = {
  project: GeoCampaignProject;
  campaign: GeoCampaignWithRelations;
  summary: GeoCampaignSummary;
  analytics: VisibilityAnalytics;
};

export type GeoCampaignCreateInput = {
  projectId: string;
  name: string;
  industry: string;
  businessDescription: string;
  goal: string;
  targetCustomers: string;
  platforms: GeoCampaignPlatform[];
  queryCount: number;
};


import type { Project } from "@/types/project";

export type VisibilityCampaign = {
  id: string;
  projectId: string;
  keyword: string;
  createdAt: string;
};

export type VisibilityPrompt = {
  id: string;
  campaignId: string;
  prompt: string;
  createdAt: string;
};

export type VisibilityCheck = {
  id: string;
  campaignId: string;
  promptId: string | null;
  provider: string;
  prompt: string;
  answer: string;
  brandMentioned: boolean;
  mentionPosition: number | null;
  sourceUrls: string[];
  score: number;
  createdAt: string;
};

export type VisibilityCampaignWithChecks = VisibilityCampaign & {
  prompts: VisibilityPrompt[];
  checks: VisibilityCheck[];
  latestCheck: VisibilityCheck | null;
};

export type VisibilityProviderAnalytics = {
  provider: string;
  totalChecks: number;
  brandMentions: number;
  brandMentionRate: number;
  averageMentionPosition: number | null;
  averageScore: number;
};

export type VisibilityTrendPoint = {
  date: string;
  totalChecks: number;
  brandMentions: number;
  brandMentionRate: number;
};

export type VisibilityPromptAnalytics = {
  promptId: string | null;
  campaignId: string;
  campaignKeyword: string;
  prompt: string;
  totalChecks: number;
  brandMentions: number;
  brandMentionRate: number;
  averageMentionPosition: number | null;
};

export type VisibilityAnalytics = {
  totalChecks: number;
  brandMentions: number;
  brandMentionRate: number;
  averageMentionPosition: number | null;
  averageScore: number;
  providerPerformance: VisibilityProviderAnalytics[];
  trend: VisibilityTrendPoint[];
  promptAnalytics: VisibilityPromptAnalytics[];
};

export type VisibilityWorkspaceProject = Pick<Project, "id" | "name" | "websiteUrl">;

export type VisibilityResponse = {
  projects: VisibilityWorkspaceProject[];
  selectedProjectId: string | null;
  campaigns: VisibilityCampaignWithChecks[];
  summary: {
    totalCampaigns: number;
    totalPrompts: number;
    totalChecks: number;
    aiAppearances: number;
    brandMentionRate: number;
    averageMentionPosition: number | null;
    averageScore: number;
  };
  analytics: VisibilityAnalytics;
  error?: string;
};

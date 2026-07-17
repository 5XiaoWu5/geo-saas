import type { Project } from "@/types/project";

export type VisibilityCampaign = {
  id: string;
  projectId: string;
  keyword: string;
  createdAt: string;
};

export type VisibilityCheck = {
  id: string;
  campaignId: string;
  provider: string;
  prompt: string;
  answer: string;
  brandMentioned: boolean;
  position: number | null;
  score: number;
  createdAt: string;
};

export type VisibilityCampaignWithChecks = VisibilityCampaign & {
  checks: VisibilityCheck[];
  latestCheck: VisibilityCheck | null;
};

export type VisibilityWorkspaceProject = Pick<Project, "id" | "name" | "websiteUrl">;

export type VisibilityResponse = {
  projects: VisibilityWorkspaceProject[];
  selectedProjectId: string | null;
  campaigns: VisibilityCampaignWithChecks[];
  summary: {
    totalCampaigns: number;
    totalChecks: number;
    mentionedChecks: number;
    averageScore: number;
  };
  error?: string;
};

import type { GeoIssue, GeoIssueCategory, GeoIssueSeverity } from "@/features/geo-analysis/types";

export type GrowthOpportunityDimension = "SEO" | "GEO" | "KNOWLEDGE" | "COMPETITIVE";
export type GrowthOpportunitySource = "SEO_ANALYSIS" | "GEO_ANALYSIS" | "KNOWLEDGE_GAP" | "BENCHMARK_GAP";

export type GrowthOpportunity = {
  id: string;
  projectId: string;
  dimension: GrowthOpportunityDimension;
  source: GrowthOpportunitySource;
  sourceLabel: string;
  title: string;
  problem: string;
  impact: string;
  recommendation: string;
  severity: GeoIssueSeverity;
  issueCategory: GeoIssueCategory;
  optimizationIssueId: string;
  trackedTaskId: string | null;
};

export type GrowthOpportunityTaskInput = Pick<GrowthOpportunity, "id" | "source" | "title" | "problem" | "recommendation" | "severity" | "issueCategory" | "optimizationIssueId">;

export type GrowthOpportunityBuildInput = {
  projectId: string;
  analysisIssues?: GeoIssue[];
  knowledgeGaps?: Array<{ type: string; severity: "HIGH" | "MEDIUM" | "LOW"; reason: string }>;
  benchmarkGaps?: Array<{
    metric: string;
    available: boolean;
    actionable: boolean;
    difference: number | null;
    leadingCompetitor: string | null;
  }>;
  trackedTasks?: Array<{ id: string; issueId: string }>;
};

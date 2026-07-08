import type { IssueStatus } from "@/features/geo-engine/audit/types/issue-lifecycle.types";

export type GEOIssueCategory = "Entity" | "Schema" | "Content" | "Structure" | "Citation" | "AI_Readability";
export type GEOIssueSeverity = "critical" | "warning" | "suggestion";

export type GEOIssueEvidence = {
  id: string;
  issueId: string;
  url: string;
  finding: string;
  location: string;
};

export type GEOIssue = {
  id: string;
  projectId: string;
  scanId: string;
  category: GEOIssueCategory;
  severity: GEOIssueSeverity;
  title: string;
  description: string;
  evidenceIds: string[];
  evidence?: GEOIssueEvidence[];
  recommendation: string;
  status: IssueStatus;
};

export type DraftGEOIssueEvidence = Omit<GEOIssueEvidence, "id" | "issueId">;

export type DraftGEOIssue = Omit<GEOIssue, "id" | "evidenceIds" | "evidence" | "status"> & {
  evidence: DraftGEOIssueEvidence[];
};

export type AuditOptimizationTask = {
  title: string;
  priority: "High" | "Medium" | "Low";
  estimatedImpact: number;
  relatedPage: string;
  issueId: string;
};

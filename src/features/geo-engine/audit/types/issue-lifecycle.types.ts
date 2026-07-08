export type IssueStatus = "open" | "in_progress" | "ignored" | "fixed" | "regression";

export type GEOIssueLifecycle = {
  issueId: string;
  status: IssueStatus;
  createdAt: string;
  updatedAt: string;
  fixedAt: string | null;
  resolvedScanId: string | null;
};

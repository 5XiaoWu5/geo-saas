import type { GEOIssue } from "@/features/geo-engine/audit/types/audit.types";
import type { GEOIssueLifecycle, IssueStatus } from "@/features/geo-engine/audit/types/issue-lifecycle.types";

export interface AuditRepository {
  saveIssues(projectId: string, issues: GEOIssue[]): Promise<GEOIssue[]>;
  getProjectIssues(projectId: string): Promise<GEOIssue[]>;
  updateIssueStatus(issueId: string, status: IssueStatus, resolvedScanId?: string): Promise<GEOIssueLifecycle>;
  getIssueHistory(issueId: string): Promise<GEOIssueLifecycle[]>;
  getOpenIssues(projectId: string): Promise<GEOIssue[]>;
}

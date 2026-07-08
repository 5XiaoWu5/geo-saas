import type { AuditRepository } from "@/features/geo-engine/audit/repository/audit.repository";
import type { GEOIssue } from "@/features/geo-engine/audit/types/audit.types";
import type { GEOIssueLifecycle, IssueStatus } from "@/features/geo-engine/audit/types/issue-lifecycle.types";

const issuesByProject = new Map<string, GEOIssue[]>();
const lifecycleByIssue = new Map<string, GEOIssueLifecycle[]>();

function now(): string {
  return new Date().toISOString();
}

function createLifecycle(issueId: string, status: IssueStatus = "open", resolvedScanId: string | null = null): GEOIssueLifecycle {
  const timestamp = now();
  return {
    issueId,
    status,
    createdAt: timestamp,
    updatedAt: timestamp,
    fixedAt: status === "fixed" ? timestamp : null,
    resolvedScanId,
  };
}

export class MockAuditRepository implements AuditRepository {
  async saveIssues(projectId: string, issues: GEOIssue[]): Promise<GEOIssue[]> {
    const existingIssues = issuesByProject.get(projectId) ?? [];
    const existingByTitle = new Map(existingIssues.map((issue) => [`${issue.category}:${issue.title}`, issue]));

    const normalizedIssues = issues.map((issue) => {
      const previous = existingByTitle.get(`${issue.category}:${issue.title}`);
      const previousLifecycle = previous ? lifecycleByIssue.get(previous.id)?.at(-1) : null;
      const status = previousLifecycle?.status === "fixed" ? "regression" : previousLifecycle?.status ?? issue.status;
      const normalizedIssue = { ...issue, status };

      if (!lifecycleByIssue.has(issue.id)) {
        lifecycleByIssue.set(issue.id, [createLifecycle(issue.id, status)]);
      } else if (status === "regression") {
        const history = lifecycleByIssue.get(issue.id) ?? [];
        history.push(createLifecycle(issue.id, "regression"));
        lifecycleByIssue.set(issue.id, history);
      }

      return normalizedIssue;
    });

    issuesByProject.set(projectId, normalizedIssues);
    return normalizedIssues;
  }

  async getProjectIssues(projectId: string): Promise<GEOIssue[]> {
    return issuesByProject.get(projectId) ?? [];
  }

  async updateIssueStatus(issueId: string, status: IssueStatus, resolvedScanId?: string): Promise<GEOIssueLifecycle> {
    const history = lifecycleByIssue.get(issueId) ?? [];
    const createdAt = history[0]?.createdAt ?? now();
    const updatedAt = now();
    const lifecycle: GEOIssueLifecycle = {
      issueId,
      status,
      createdAt,
      updatedAt,
      fixedAt: status === "fixed" ? updatedAt : null,
      resolvedScanId: resolvedScanId ?? null,
    };

    lifecycleByIssue.set(issueId, [...history, lifecycle]);

    for (const [projectId, issues] of issuesByProject.entries()) {
      if (issues.some((issue) => issue.id === issueId)) {
        issuesByProject.set(projectId, issues.map((issue) => issue.id === issueId ? { ...issue, status } : issue));
      }
    }

    return lifecycle;
  }

  async getIssueHistory(issueId: string): Promise<GEOIssueLifecycle[]> {
    return lifecycleByIssue.get(issueId) ?? [];
  }

  async getOpenIssues(projectId: string): Promise<GEOIssue[]> {
    const issues = issuesByProject.get(projectId) ?? [];
    return issues.filter((issue) => issue.status === "open" || issue.status === "in_progress" || issue.status === "regression");
  }
}

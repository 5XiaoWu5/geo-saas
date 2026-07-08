import { getAuditRepository } from "@/features/geo-engine/audit/repository";
import { getEvidenceRepository } from "@/features/geo-engine/audit/repository/evidence.repository";
import { runAuditRules } from "@/features/geo-engine/audit/rules/audit.rules.service";
import { createOptimizationTaskFromIssue } from "@/features/geo-engine/audit/services/recommendation.service";
import type { AuditOptimizationTask, GEOIssue } from "@/features/geo-engine/audit/types/audit.types";
import type { IssueStatus, GEOIssueLifecycle } from "@/features/geo-engine/audit/types/issue-lifecycle.types";
import type { WebsiteGEOResult } from "@/features/geo-engine/types/scan.types";

async function hydrateEvidence(issue: GEOIssue): Promise<GEOIssue> {
  const evidence = await getEvidenceRepository().getIssueEvidence(issue.id);
  return { ...issue, evidence };
}

export async function analyzeAuditIssues(projectId: string, result: WebsiteGEOResult): Promise<GEOIssue[]> {
  const issuesWithEvidence = runAuditRules(projectId, result);
  const normalizedIssues = await Promise.all(issuesWithEvidence.map(async (issue) => {
    const evidence = await getEvidenceRepository().saveEvidence(issue.id, issue.evidence ?? []);
    return { ...issue, evidenceIds: evidence.map((item) => item.id), evidence: undefined };
  }));
  const savedIssues = await getAuditRepository().saveIssues(projectId, normalizedIssues);
  return Promise.all(savedIssues.map(hydrateEvidence));
}

export async function getProjectIssues(projectId: string): Promise<GEOIssue[]> {
  const issues = await getAuditRepository().getProjectIssues(projectId);
  return Promise.all(issues.map(hydrateEvidence));
}

export async function getOpenIssues(projectId: string): Promise<GEOIssue[]> {
  const issues = await getAuditRepository().getOpenIssues(projectId);
  return Promise.all(issues.map(hydrateEvidence));
}

export async function updateIssueStatus(issueId: string, status: IssueStatus, resolvedScanId?: string): Promise<GEOIssueLifecycle> {
  return getAuditRepository().updateIssueStatus(issueId, status, resolvedScanId);
}

export async function getIssueHistory(issueId: string): Promise<GEOIssueLifecycle[]> {
  return getAuditRepository().getIssueHistory(issueId);
}

export async function getOptimizationTasksFromIssues(projectId: string): Promise<AuditOptimizationTask[]> {
  const issues = await getOpenIssues(projectId);
  return issues.map(createOptimizationTaskFromIssue);
}

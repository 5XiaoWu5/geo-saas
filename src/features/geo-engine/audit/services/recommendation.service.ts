import type { AuditOptimizationTask, GEOIssue } from "@/features/geo-engine/audit/types/audit.types";

export function createOptimizationTaskFromIssue(issue: GEOIssue): AuditOptimizationTask {
  const priority = issue.severity === "critical" ? "High" : issue.severity === "warning" ? "Medium" : "Low";
  const estimatedImpact = issue.severity === "critical" ? 10 : issue.severity === "warning" ? 6 : 3;

  return {
    title: issue.recommendation,
    priority,
    estimatedImpact,
    relatedPage: issue.evidence?.[0]?.url ?? "/",
    issueId: issue.id,
  };
}


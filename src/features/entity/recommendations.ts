import type { EntityMissingItem } from "@/features/entity/types";

export function toEntityIssueId(projectId: string, item: EntityMissingItem) {
  return `entity:${projectId}:${item.key}`;
}

export function buildEntityOptimizationTask(projectId: string, item: EntityMissingItem) {
  return {
    projectId,
    issueId: toEntityIssueId(projectId, item),
    title: item.title,
    description: item.description,
    recommendation: item.recommendation,
    severity: item.severity,
    category: item.category,
    status: "PENDING",
  };
}

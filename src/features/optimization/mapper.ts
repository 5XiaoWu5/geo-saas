import type { GeoIssue } from "@/features/geo-analysis/types";
import { recommendForIssue } from "@/features/geo-analysis/recommendations";
import type { OptimizationSeverity, OptimizationTask } from "@/features/optimization/types";
import type { GrowthOpportunityTaskInput } from "@/features/growth-engine/types";

// GeoIssue severity → 优化任务严重程度（High / Medium / Low）
export function toOptimizationSeverity(severity: GeoIssue["severity"]): OptimizationSeverity {
  if (severity === "critical") return "High";
  if (severity === "warning") return "Medium";
  return "Low";
}

// 为每个问题生成稳定 issueId（同一分析内按分类+标题去重）
export function toIssueId(issue: GeoIssue): string {
  return `${issue.category}:${issue.title}`;
}

export function toOptimizationTask(row: Record<string, unknown>): OptimizationTask {
  const createdAt = row.createdAt instanceof Date ? row.createdAt : new Date(String(row.createdAt));
  const updatedAt = row.updatedAt instanceof Date ? row.updatedAt : new Date(String(row.updatedAt));
  const severity = String(row.severity ?? "Medium") as OptimizationSeverity;
  const status = String(row.status ?? "PENDING") as OptimizationTask["status"];

  return {
    id: String(row.id),
    projectId: String(row.projectId),
    issueId: String(row.issueId),
    title: String(row.title),
    description: String(row.description ?? ""),
    recommendation: String(row.recommendation ?? ""),
    severity: ["High", "Medium", "Low"].includes(severity) ? severity : "Medium",
    category: String(row.category ?? ""),
    status: ["PENDING", "PROCESSING", "COMPLETED"].includes(status) ? status : "PENDING",
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
}

// 从一条 GeoIssue 派生新建任务所需字段（含规则引擎优化建议）
export function buildTaskInputFromIssue(projectId: string, issue: GeoIssue) {
  return {
    projectId,
    issueId: toIssueId(issue),
    title: issue.title,
    description: issue.description,
    recommendation: recommendForIssue(issue),
    severity: toOptimizationSeverity(issue.severity),
    category: issue.category,
  };
}

export function buildTaskInputFromOpportunity(projectId: string, opportunity: GrowthOpportunityTaskInput) {
  const category = opportunity.source === "KNOWLEDGE_GAP"
    ? "knowledge"
    : opportunity.source === "BENCHMARK_GAP"
      ? "benchmark"
      : opportunity.source === "AI_RECOMMENDATION_GAP"
        ? "ai_recommendation"
        : opportunity.source === "REAL_AI_VISIBILITY_GAP"
          ? "real_ai_visibility"
      : opportunity.issueCategory;
  return {
    projectId,
    issueId: opportunity.optimizationIssueId,
    title: opportunity.title,
    description: opportunity.problem,
    recommendation: opportunity.recommendation,
    severity: toOptimizationSeverity(opportunity.severity),
    category,
  };
}

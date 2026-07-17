export type OptimizationStatus = "PENDING" | "PROCESSING" | "COMPLETED";

export type OptimizationSeverity = "High" | "Medium" | "Low";

export type OptimizationTask = {
  id: string;
  projectId: string;
  issueId: string;
  title: string;
  description: string;
  recommendation: string;
  severity: OptimizationSeverity;
  category: string;
  status: OptimizationStatus;
  createdAt: string;
  updatedAt: string;
};

export const OPTIMIZATION_STATUSES: OptimizationStatus[] = ["PENDING", "PROCESSING", "COMPLETED"];

export function isOptimizationStatus(value: unknown): value is OptimizationStatus {
  return typeof value === "string" && OPTIMIZATION_STATUSES.includes(value as OptimizationStatus);
}

export function getOptimizationStatusLabel(status: OptimizationStatus): string {
  const labels: Record<OptimizationStatus, string> = {
    PENDING: "未处理",
    PROCESSING: "处理中",
    COMPLETED: "已完成",
  };
  return labels[status];
}

export function getOptimizationSeverityLabel(severity: OptimizationSeverity): string {
  const labels: Record<OptimizationSeverity, string> = {
    High: "高",
    Medium: "中",
    Low: "低",
  };
  return labels[severity];
}

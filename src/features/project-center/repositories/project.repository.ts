import type { GeoAnalyzerReport } from "@/features/geo-analyzer/types";
import type { MonitoringSnapshot } from "@/features/monitoring/types";
import type { OptimizationCenterData } from "@/features/optimization-center/types";
import type { ProjectActivity } from "@/features/project-center/data/project-activity";
import type { ProjectMetrics } from "@/features/project-center/data/project-metrics";
import type { VisibilityMonitorData } from "@/features/visibility-monitor/types";
import type { Project } from "@/types/project";

export interface ProjectRepository {
  getProject(projectId: string): Promise<Project>;
  getProjectsByWorkspace(workspaceId: string): Promise<Project[]>;
  getProjectByWorkspace(workspaceId: string, projectId: string): Promise<Project>;
  getProjects(): Promise<Project[]>;
  getProjectMetrics(projectId: string): Promise<ProjectMetrics>;
  getProjectActivity(projectId: string): Promise<ProjectActivity[]>;
  getAnalyzerResult(projectId: string): Promise<GeoAnalyzerReport>;
  getVisibilityData(projectId: string): Promise<VisibilityMonitorData>;
  getOptimizationTasks(projectId: string): Promise<OptimizationCenterData>;
  getMonitoringData(projectId: string): Promise<MonitoringSnapshot>;
}


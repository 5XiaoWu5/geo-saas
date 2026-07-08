import type { GeoAnalyzerReport } from "@/features/geo-analyzer/types";
import type { MonitoringSnapshot } from "@/features/monitoring/types";
import type { OptimizationCenterData } from "@/features/optimization-center/types";
import type { ProjectActivity } from "@/features/project-center/data/project-activity";
import type { ProjectMetrics } from "@/features/project-center/data/project-metrics";
import { getProjectRepository } from "@/features/project-center/repositories";
import type { VisibilityMonitorData } from "@/features/visibility-monitor/types";
import type { Project } from "@/types/project";

export async function getProject(projectId: string): Promise<Project> {
  return getProjectRepository().getProject(projectId);
}

export async function getProjects(): Promise<Project[]> {
  return getProjectRepository().getProjects();
}

export async function getProjectsByWorkspace(workspaceId: string): Promise<Project[]> {
  return getProjectRepository().getProjectsByWorkspace(workspaceId);
}

export async function getProjectByWorkspace(workspaceId: string, projectId: string): Promise<Project> {
  return getProjectRepository().getProjectByWorkspace(workspaceId, projectId);
}

export async function getAnalyzerResult(projectId: string): Promise<GeoAnalyzerReport> {
  return getProjectRepository().getAnalyzerResult(projectId);
}

export async function getVisibilityData(projectId: string): Promise<VisibilityMonitorData> {
  return getProjectRepository().getVisibilityData(projectId);
}

export async function getMonitoringData(projectId: string): Promise<MonitoringSnapshot> {
  return getProjectRepository().getMonitoringData(projectId);
}

export async function getOptimizationTasks(projectId: string): Promise<OptimizationCenterData> {
  return getProjectRepository().getOptimizationTasks(projectId);
}

export async function getProjectMetrics(projectId: string): Promise<ProjectMetrics> {
  return getProjectRepository().getProjectMetrics(projectId);
}

export async function getProjectActivity(projectId: string): Promise<ProjectActivity[]> {
  return getProjectRepository().getProjectActivity(projectId);
}


import { mockGeoAnalyzerReport } from "@/features/geo-analyzer";
import type { GeoAnalyzerReport } from "@/features/geo-analyzer/types";
import { monitoringSnapshot } from "@/features/monitoring";
import type { MonitoringSnapshot } from "@/features/monitoring/types";
import { getProjectIssues } from "@/features/geo-engine/core";
import { buildOptimizationCenterData } from "@/features/optimization-center";
import type { OptimizationCenterData } from "@/features/optimization-center/types";
import type { ProjectActivity } from "@/features/project-center/data/project-activity";
import type { ProjectMetrics } from "@/features/project-center/data/project-metrics";
import { projects } from "@/features/project-center/data/projects";
import type { ProjectRepository } from "@/features/project-center/repositories/project.repository";
import { visibilityMonitorData } from "@/features/visibility-monitor";
import type { VisibilityMonitorData } from "@/features/visibility-monitor/types";
import type { Project } from "@/types/project";

export class MockProjectRepository implements ProjectRepository {
  async getProject(projectId: string): Promise<Project> {
    return projects.find((project) => project.id === projectId) ?? projects[0];
  }

  async getProjects(): Promise<Project[]> {
    return projects;
  }

  async getProjectsByWorkspace(workspaceId: string): Promise<Project[]> {
    return projects.filter((project) => project.workspaceId === workspaceId);
  }

  async getProjectByWorkspace(workspaceId: string, projectId: string): Promise<Project> {
    const workspaceProjects = await this.getProjectsByWorkspace(workspaceId);
    return workspaceProjects.find((project) => project.id === projectId) ?? workspaceProjects[0] ?? projects[0];
  }

  async getAnalyzerResult(projectId: string): Promise<GeoAnalyzerReport> {
    return { ...mockGeoAnalyzerReport, projectId };
  }

  async getVisibilityData(projectId: string): Promise<VisibilityMonitorData> {
    void projectId;
    return visibilityMonitorData;
  }

  async getMonitoringData(projectId: string): Promise<MonitoringSnapshot> {
    void projectId;
    return monitoringSnapshot;
  }

  async getOptimizationTasks(projectId: string): Promise<OptimizationCenterData> {
    const analyzer = await this.getAnalyzerResult(projectId);
    const visibility = await this.getVisibilityData(projectId);
    const issues = await getProjectIssues(projectId);
    return buildOptimizationCenterData(analyzer, visibility, issues);
  }

  async getProjectMetrics(projectId: string): Promise<ProjectMetrics> {
    const project = await this.getProject(projectId);
    const analyzer = await this.getAnalyzerResult(projectId);
    const visibility = await this.getVisibilityData(projectId);
    const optimization = await this.getOptimizationTasks(projectId);
    const entityScore = analyzer.score.factors.find((factor) => factor.key === "entityCompleteness")?.score ?? 0;
    const contentScore = analyzer.score.factors.find((factor) => factor.key === "contentQuality")?.score ?? 0;
    const citationScore = analyzer.score.factors.find((factor) => factor.key === "citationPotential")?.score ?? 0;
    const schemaScore = Math.round((entityScore + citationScore) / 2);
    const optimizationProgress = optimization.tasks.length ? Math.round((optimization.stats.doneTasks / optimization.tasks.length) * 100) : 0;
    const overallHealth = Math.round(project.geoScore * 0.45 + visibility.brandScore.mentionRate * 0.25 + optimizationProgress * 0.3);

    return {
      geoScore: analyzer.score.score,
      citationScore,
      entityScore,
      schemaScore,
      contentScore,
      visibilityScore: visibility.brandScore.mentionRate,
      optimizationProgress,
      todoTasks: optimization.stats.todoTasks,
      overallHealth,
      healthTrend: [
        { date: "07-02", score: Math.max(0, overallHealth - 9) },
        { date: "07-03", score: Math.max(0, overallHealth - 7) },
        { date: "07-04", score: Math.max(0, overallHealth - 6) },
        { date: "07-05", score: Math.max(0, overallHealth - 4) },
        { date: "07-06", score: Math.max(0, overallHealth - 2) },
        { date: "07-07", score: Math.max(0, overallHealth - 1) },
        { date: "07-08", score: overallHealth },
      ],
    };
  }

  async getProjectActivity(projectId: string): Promise<ProjectActivity[]> {
    const project = await this.getProject(projectId);
    const optimization = await this.getOptimizationTasks(projectId);

    return [
      { id: "activity_scan", type: "scan", title: "最近扫描", description: project.lastScan ?? "No scan yet", createdAt: project.lastScan ?? project.createdAt },
      { id: "activity_optimization", type: "optimization", title: "最近优化任务", description: optimization.tasks[0]?.title ?? "No task", createdAt: new Date().toISOString() },
      { id: "activity_content", type: "content", title: "最近生成内容", description: optimization.generatedContent[0]?.title ?? "No content", createdAt: new Date().toISOString() },
    ];
  }
}



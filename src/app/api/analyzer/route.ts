import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/server/session";
import { prisma } from "@/features/auth/server/prisma";
import { toProject } from "@/features/projects/project-mapper";
import { toGeoAnalysis } from "@/features/geo-analysis/server/analysis-mapper";
import type { GeoAnalysis } from "@/features/geo-analysis/types";
import { toGeoBrainAnalysis } from "@/features/geo-brain/mapper";
import type { GeoBrainAnalysis } from "@/features/geo-brain/types";
import { toSimulationResult, toSimulationTask } from "@/features/ai-search-simulator/simulator.service";
import type { SimulationRecord } from "@/features/ai-search-simulator/types";
import { toGrowthSnapshot } from "@/features/growth/snapshot.service";
import { buildGrowthTrend } from "@/features/growth/trend-engine";
import type { GrowthTrend } from "@/features/growth/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AnalyzedProject = { projectId: string; projectName: string; websiteUrl: string; analysis: GeoAnalysis; brainAnalysis: GeoBrainAnalysis | null; latestSimulation: SimulationRecord | null; growthTrend: GrowthTrend };

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const [projects, analysesRows, brainRows, simulationTaskRows, growthRows] = await Promise.all([
    prisma.project.findMany({ where: { userId: user.id } }),
    prisma.geoAnalysis.findLatestForUser({ where: { userId: user.id } }),
    prisma.geoBrainAnalysis.findLatestForUser({ where: { userId: user.id } }),
    prisma.simulationTask.findManyForUser({ where: { userId: user.id, limit: 200 } }),
    prisma.growthSnapshot.findManyForUser({ where: { userId: user.id, limit: 1000 } }),
  ]);

  const projectList = projects.map(toProject);
  const analyses = analysesRows.map((row) => toGeoAnalysis(row));
  const brainAnalyses = brainRows.map((row) => toGeoBrainAnalysis(row));
  const projectById = new Map(projectList.map((project) => [project.id, project]));
  const brainByProjectId = new Map(brainAnalyses.map((analysis) => [analysis.projectId, analysis]));
  const growthSnapshots = growthRows.map(toGrowthSnapshot);
  const simulationResultRows = await prisma.simulationResult.findManyForTasks({ where: { taskIds: simulationTaskRows.map((row) => String(row.id)) } });
  const simulationResultByTaskId = new Map(simulationResultRows.map((row) => {
    const result = toSimulationResult(row);
    return [result.taskId, result] as const;
  }));
  const latestSimulationByProjectId = new Map<string, SimulationRecord>();
  for (const row of simulationTaskRows) {
    const task = toSimulationTask(row);
    const result = simulationResultByTaskId.get(task.id) ?? null;
    if (!latestSimulationByProjectId.has(task.projectId) && task.status === "COMPLETED" && result) {
      latestSimulationByProjectId.set(task.projectId, { ...task, result, trend: null });
    }
  }

  const analyzedProjects = analyses
    .map((analysis) => {
      const project = projectById.get(analysis.projectId);
      if (!project) return null;
      return { projectId: project.id, projectName: project.name, websiteUrl: project.websiteUrl, analysis, brainAnalysis: brainByProjectId.get(project.id) ?? null, latestSimulation: latestSimulationByProjectId.get(project.id) ?? null, growthTrend: buildGrowthTrend(growthSnapshots.filter((snapshot) => snapshot.projectId === project.id), "30d") };
    })
    .filter((item): item is AnalyzedProject => item !== null)
    .sort((left, right) => new Date(right.analysis.createdAt).getTime() - new Date(left.analysis.createdAt).getTime());

  const analyzedCount = analyzedProjects.length;

  const summary = analyzedCount
    ? {
        totalScore: Math.round(analyzedProjects.reduce((total, item) => total + item.analysis.totalScore, 0) / analyzedCount),
        entityScore: Math.round(analyzedProjects.reduce((total, item) => total + item.analysis.entityScore, 0) / analyzedCount),
        schemaScore: Math.round(analyzedProjects.reduce((total, item) => total + item.analysis.schemaScore, 0) / analyzedCount),
        technicalScore: Math.round(analyzedProjects.reduce((total, item) => total + item.analysis.technicalScore, 0) / analyzedCount),
        contentScore: Math.round(analyzedProjects.reduce((total, item) => total + item.analysis.contentScore, 0) / analyzedCount),
        lastAnalysisAt: analyzedProjects[0]?.analysis.createdAt ?? null,
      }
    : null;

  return NextResponse.json({
    totalProjects: projectList.length,
    analyzedCount,
    summary,
    latest: analyzedProjects[0] ?? null,
    projects: analyzedProjects,
  });
}

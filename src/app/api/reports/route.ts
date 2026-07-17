import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/server/session";
import { prisma } from "@/features/auth/server/prisma";
import { toProject } from "@/features/projects/project-mapper";
import { toGeoAnalysis } from "@/features/geo-analysis/server/analysis-mapper";
import { toWebsiteScan } from "@/features/website-crawl/server/scan-mapper";
import { toOptimizationTask } from "@/features/optimization/mapper";
import { toSimulationResult, toSimulationTask } from "@/features/ai-search-simulator/simulator.service";
import type { SimulationRecord } from "@/features/ai-search-simulator/types";
import { toGrowthSnapshot } from "@/features/growth/snapshot.service";
import { buildGrowthTrend } from "@/features/growth/trend-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const [projectRows, analysisRows, scanRows, simulationTaskRows, growthRows] = await Promise.all([
    prisma.project.findMany({ where: { userId: user.id } }),
    prisma.geoAnalysis.findLatestForUser({ where: { userId: user.id } }),
    prisma.websiteScan.findManyForUser({ where: { userId: user.id } }),
    prisma.simulationTask.findManyForUser({ where: { userId: user.id, limit: 200 } }),
    prisma.growthSnapshot.findManyForUser({ where: { userId: user.id, limit: 1000 } }),
  ]);

  const projects = projectRows.map(toProject);
  const analyses = analysisRows.map(toGeoAnalysis);
  const scans = scanRows.map(toWebsiteScan);
  const tasksByProject = await Promise.all(
    projects.map(async (project) => {
      const rows = await prisma.optimizationTask.findManyForProject({ where: { projectId: project.id, userId: user.id } });
      return [project.id, rows.map(toOptimizationTask)] as const;
    }),
  );

  const analysisByProjectId = new Map(analyses.map((analysis) => [analysis.projectId, analysis]));
  const latestScanByProjectId = new Map(scans.map((scan) => [scan.projectId, scan]));
  const taskMap = new Map(tasksByProject);
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

  const reports = projects
    .map((project) => {
      const analysis = analysisByProjectId.get(project.id) ?? null;
      const scan = latestScanByProjectId.get(project.id) ?? null;
      const tasks = taskMap.get(project.id) ?? [];
      const completedTasks = tasks.filter((task) => task.status === "COMPLETED").length;

      return {
        projectId: project.id,
        projectName: project.name,
        websiteUrl: project.websiteUrl,
        project,
        scan,
        analysis,
        latestSimulation: latestSimulationByProjectId.get(project.id) ?? null,
        growthTrend: buildGrowthTrend(growthSnapshots.filter((snapshot) => snapshot.projectId === project.id), "30d"),
        optimization: {
          totalTasks: tasks.length,
          completedTasks,
          incompleteTasks: tasks.length - completedTasks,
        },
      };
    })
    .sort((left, right) => {
      const leftTime = left.analysis?.createdAt ?? left.scan?.createdAt ?? left.project.createdAt;
      const rightTime = right.analysis?.createdAt ?? right.scan?.createdAt ?? right.project.createdAt;
      return new Date(rightTime).getTime() - new Date(leftTime).getTime();
    });

  return NextResponse.json({
    totalProjects: projects.length,
    reportCount: reports.filter((report) => report.analysis).length,
    reports,
  });
}

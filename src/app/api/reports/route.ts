import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/server/session";
import { prisma } from "@/features/auth/server/prisma";
import { toProject } from "@/features/projects/project-mapper";
import { toGeoAnalysis } from "@/features/geo-analysis/server/analysis-mapper";
import { toWebsiteScan } from "@/features/website-crawl/server/scan-mapper";
import { toOptimizationTask } from "@/features/optimization/mapper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const [projectRows, analysisRows, scanRows] = await Promise.all([
    prisma.project.findMany({ where: { userId: user.id } }),
    prisma.geoAnalysis.findLatestForUser({ where: { userId: user.id } }),
    prisma.websiteScan.findManyForUser({ where: { userId: user.id } }),
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

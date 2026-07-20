import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/server/session";
import { prisma } from "@/features/auth/server/prisma";
import { analyzeBenchmarkGaps, loadLatestBenchmarkData, listCompetitors } from "@/features/competitor-benchmark";
import type { BenchmarkOverviewResult, BenchmarkOverviewResponse } from "@/features/competitor-benchmark/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const projectId = new URL(request.url).searchParams.get("projectId")?.trim() ?? "";
  if (!projectId) return NextResponse.json({ error: "PROJECT_REQUIRED" }, { status: 400 });

  const project = await prisma.project.findFirst({ where: { id: projectId, userId: user.id } });
  if (!project) return NextResponse.json({ error: "PROJECT_FORBIDDEN" }, { status: 403 });

  const [benchmark, competitors] = await Promise.all([
    loadLatestBenchmarkData(user.id, projectId),
    listCompetitors(user.id, projectId),
  ]);
  const competitorNames = new Map(competitors.map((competitor) => [competitor.id, competitor.name]));
  const results: BenchmarkOverviewResult[] = benchmark.results.map((result) => ({
    ...result,
    name: result.targetType === "OWN" ? project.name : competitorNames.get(result.competitorId ?? "") ?? "未命名竞品",
  }));
  const own = results.find((result) => result.targetType === "OWN") ?? null;
  const rivals = results.filter((result) => result.targetType === "COMPETITOR");
  const response: BenchmarkOverviewResponse = {
    projectId,
    status: benchmark.status,
    run: benchmark.run,
    results,
    gaps: benchmark.status === "available" ? analyzeBenchmarkGaps(own, rivals) : [],
  };
  return NextResponse.json(response);
}

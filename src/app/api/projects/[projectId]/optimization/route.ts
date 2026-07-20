import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/server/session";
import { prisma } from "@/features/auth/server/prisma";
import { toOptimizationTask, buildTaskInputFromIssue, buildTaskInputFromOpportunity } from "@/features/optimization/mapper";
import { toGeoAnalysis } from "@/features/geo-analysis/server/analysis-mapper";
import type { GeoIssue } from "@/features/geo-analysis/types";
import type { GrowthOpportunityTaskInput } from "@/features/growth-engine/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireOwnedProject(projectId: string) {
  const user = await getCurrentUser();
  if (!user) return { user: null, project: null, response: NextResponse.json({ error: "请先登录" }, { status: 401 }) };

  const project = await prisma.project.findFirst({ where: { id: projectId, userId: user.id } });
  if (!project) return { user, project: null, response: NextResponse.json({ error: "项目不存在或无权访问" }, { status: 404 }) };

  return { user, project, response: null };
}

export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { user, project, response } = await requireOwnedProject(projectId);
  if (response) return response;

  const [tasksRows, analysisRow] = await Promise.all([
    prisma.optimizationTask.findManyForProject({ where: { projectId: project.id, userId: user.id } }),
    prisma.geoAnalysis.findLatest({ where: { projectId: project.id } }),
  ]);

  const tasks = tasksRows.map(toOptimizationTask);
  const analysis = analysisRow ? toGeoAnalysis(analysisRow) : null;
  const trackedIssueIds = new Set(tasks.map((task) => task.issueId));

  return NextResponse.json({
    tasks,
    issues: analysis?.issues ?? [],
    analysis: analysis ? {
      totalScore: analysis.totalScore,
      entityScore: analysis.entityScore,
      schemaScore: analysis.schemaScore,
      technicalScore: analysis.technicalScore,
      contentScore: analysis.contentScore,
      createdAt: analysis.createdAt,
    } : null,
    trackedIssueIds: [...trackedIssueIds],
    analysisAt: analysis?.createdAt ?? null,
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { project, response } = await requireOwnedProject(projectId);
  if (response) return response;

  let body: { issue?: GeoIssue; opportunity?: GrowthOpportunityTaskInput };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式无效" }, { status: 400 });
  }

  const issue = body.issue;
  const opportunity = body.opportunity;
  const validIssue = issue && typeof issue.title === "string" && typeof issue.category === "string" && typeof issue.severity === "string";
  const validOpportunity = opportunity
    && typeof opportunity.id === "string"
    && typeof opportunity.optimizationIssueId === "string"
    && typeof opportunity.title === "string"
    && typeof opportunity.problem === "string"
    && typeof opportunity.recommendation === "string"
    && ["SEO_ANALYSIS", "GEO_ANALYSIS", "KNOWLEDGE_GAP", "BENCHMARK_GAP"].includes(opportunity.source)
    && ["critical", "warning", "suggestion"].includes(opportunity.severity)
    && ["entity", "schema", "technical", "content"].includes(opportunity.issueCategory);
  if (!validIssue && !validOpportunity) {
    return NextResponse.json({ error: "缺少有效的问题信息" }, { status: 400 });
  }

  const input = validOpportunity
    ? buildTaskInputFromOpportunity(project.id, opportunity)
    : buildTaskInputFromIssue(project.id, issue as GeoIssue);

  // 幂等：同一问题（issueId）已有任务则直接返回，避免重复创建。
  const existing = await prisma.optimizationTask.findByIssue({ where: { projectId: project.id, issueId: input.issueId } });
  if (existing) return NextResponse.json({ task: toOptimizationTask(existing), created: false });

  const created = await prisma.optimizationTask.create({ data: { ...input, status: "PENDING" } });
  return NextResponse.json({ task: toOptimizationTask(created), created: true }, { status: 201 });
}

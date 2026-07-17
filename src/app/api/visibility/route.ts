import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/features/auth/server/session";
import { prisma } from "@/features/auth/server/prisma";
import { toProject } from "@/features/projects/project-mapper";
import { toVisibilityCampaign, toVisibilityCheck } from "@/features/visibility/mapper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createCampaignSchema = z.object({
  projectId: z.string().min(1),
  keyword: z.string().trim().min(1, "关键词不能为空").max(160, "关键词过长"),
});

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) return { user: null, response: NextResponse.json({ error: "请先登录" }, { status: 401 }) };
  return { user, response: null };
}

function buildSummary(checks: ReturnType<typeof toVisibilityCheck>[], campaignCount: number) {
  const mentionedChecks = checks.filter((check) => check.brandMentioned).length;
  const averageScore = checks.length ? Math.round(checks.reduce((total, check) => total + check.score, 0) / checks.length) : 0;
  return { totalCampaigns: campaignCount, totalChecks: checks.length, mentionedChecks, averageScore };
}

export async function GET(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const url = new URL(request.url);
  const requestedProjectId = url.searchParams.get("projectId") ?? undefined;
  const projects = (await prisma.project.findMany({ where: { userId: user.id } })).map(toProject);
  const ownedProjectIds = new Set(projects.map((project) => project.id));
  const selectedProjectId = requestedProjectId && ownedProjectIds.has(requestedProjectId) ? requestedProjectId : projects[0]?.id ?? null;

  if (!selectedProjectId) {
    return NextResponse.json({
      projects: [],
      selectedProjectId: null,
      campaigns: [],
      summary: buildSummary([], 0),
    });
  }

  const campaignRows = await prisma.visibilityCampaign.findManyForUser({ where: { userId: user.id, projectId: selectedProjectId } });
  const campaigns = campaignRows.map(toVisibilityCampaign);
  const checks = (await prisma.visibilityCheck.findManyForUser({ where: { userId: user.id, campaignIds: campaigns.map((campaign) => campaign.id) } })).map(toVisibilityCheck);
  const checksByCampaignId = new Map<string, typeof checks>();

  for (const check of checks) {
    checksByCampaignId.set(check.campaignId, [...(checksByCampaignId.get(check.campaignId) ?? []), check]);
  }

  return NextResponse.json({
    projects: projects.map((project) => ({ id: project.id, name: project.name, websiteUrl: project.websiteUrl })),
    selectedProjectId,
    campaigns: campaigns.map((campaign) => {
      const campaignChecks = checksByCampaignId.get(campaign.id) ?? [];
      return { ...campaign, checks: campaignChecks, latestCheck: campaignChecks[0] ?? null };
    }),
    summary: buildSummary(checks, campaigns.length),
  });
}

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const parsed = createCampaignSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "参数无效" }, { status: 400 });

  const project = await prisma.project.findFirst({ where: { id: parsed.data.projectId, userId: user.id } });
  if (!project) return NextResponse.json({ error: "项目不存在或无权访问" }, { status: 404 });

  const campaign = await prisma.visibilityCampaign.create({
    data: {
      projectId: project.id,
      keyword: parsed.data.keyword,
    },
  });

  return NextResponse.json({ campaign: toVisibilityCampaign(campaign) }, { status: 201 });
}

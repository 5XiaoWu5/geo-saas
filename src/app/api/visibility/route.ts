import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/features/auth/server/session";
import { prisma } from "@/features/auth/server/prisma";
import { toProject } from "@/features/projects/project-mapper";
import { toVisibilityCampaign, toVisibilityCheck, toVisibilityPrompt } from "@/features/visibility/mapper";

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

function buildSummary(checks: ReturnType<typeof toVisibilityCheck>[], campaignCount: number, promptCount: number) {
  const aiAppearances = checks.filter((check) => check.brandMentioned).length;
  const averageScore = checks.length ? Math.round(checks.reduce((total, check) => total + check.score, 0) / checks.length) : 0;
  const mentionPositions = checks
    .map((check) => check.mentionPosition)
    .filter((position): position is number => typeof position === "number" && Number.isFinite(position));
  const averageMentionPosition = mentionPositions.length ? Math.round(mentionPositions.reduce((total, position) => total + position, 0) / mentionPositions.length) : null;
  const brandMentionRate = checks.length ? Math.round((aiAppearances / checks.length) * 100) : 0;

  return {
    totalCampaigns: campaignCount,
    totalPrompts: promptCount,
    totalChecks: checks.length,
    aiAppearances,
    brandMentionRate,
    averageMentionPosition,
    averageScore,
  };
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
      summary: buildSummary([], 0, 0),
    });
  }

  const campaignRows = await prisma.visibilityCampaign.findManyForUser({ where: { userId: user.id, projectId: selectedProjectId } });
  const campaigns = campaignRows.map(toVisibilityCampaign);
  const campaignIds = campaigns.map((campaign) => campaign.id);
  const prompts = (await prisma.visibilityPrompt.findManyForUser({ where: { userId: user.id, campaignIds } })).map(toVisibilityPrompt);
  const checks = (await prisma.visibilityCheck.findManyForUser({ where: { userId: user.id, campaignIds } })).map(toVisibilityCheck);
  const promptsByCampaignId = new Map<string, typeof prompts>();
  const checksByCampaignId = new Map<string, typeof checks>();

  for (const prompt of prompts) {
    promptsByCampaignId.set(prompt.campaignId, [...(promptsByCampaignId.get(prompt.campaignId) ?? []), prompt]);
  }

  for (const check of checks) {
    checksByCampaignId.set(check.campaignId, [...(checksByCampaignId.get(check.campaignId) ?? []), check]);
  }

  return NextResponse.json({
    projects: projects.map((project) => ({ id: project.id, name: project.name, websiteUrl: project.websiteUrl })),
    selectedProjectId,
    campaigns: campaigns.map((campaign) => {
      const campaignPrompts = promptsByCampaignId.get(campaign.id) ?? [];
      const campaignChecks = checksByCampaignId.get(campaign.id) ?? [];
      return { ...campaign, prompts: campaignPrompts, checks: campaignChecks, latestCheck: campaignChecks[0] ?? null };
    }),
    summary: buildSummary(checks, campaigns.length, prompts.length),
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

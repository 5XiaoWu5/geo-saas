import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/server/session";
import { prisma } from "@/features/auth/server/prisma";
import { toProject } from "@/features/projects/project-mapper";
import { buildVisibilityAnalytics, emptyVisibilityAnalytics } from "@/features/visibility/analytics";
import { toVisibilityCampaign, toVisibilityCheck, toVisibilityPrompt } from "@/features/visibility/mapper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const url = new URL(request.url);
  const requestedProjectId = url.searchParams.get("projectId") ?? undefined;
  const projects = (await prisma.project.findMany({ where: { userId: user.id } })).map(toProject);
  const ownedProjectIds = new Set(projects.map((project) => project.id));
  const selectedProjectId = requestedProjectId && ownedProjectIds.has(requestedProjectId) ? requestedProjectId : projects[0]?.id ?? null;

  if (!selectedProjectId) {
    return NextResponse.json({
      selectedProjectId: null,
      analytics: emptyVisibilityAnalytics(),
    });
  }

  const campaigns = (await prisma.visibilityCampaign.findManyForUser({ where: { userId: user.id, projectId: selectedProjectId } })).map(toVisibilityCampaign);
  const campaignIds = campaigns.map((campaign) => campaign.id);
  const prompts = (await prisma.visibilityPrompt.findManyForUser({ where: { userId: user.id, campaignIds } })).map(toVisibilityPrompt);
  const checks = (await prisma.visibilityCheck.findManyForUser({ where: { userId: user.id, campaignIds } })).map(toVisibilityCheck);

  return NextResponse.json({
    selectedProjectId,
    analytics: buildVisibilityAnalytics(campaigns, prompts, checks),
  });
}

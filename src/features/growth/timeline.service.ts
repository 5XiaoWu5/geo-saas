import { prisma } from "@/features/auth/server/prisma";
import { toGeoCampaign } from "@/features/geo-campaign/campaign.service";
import type { GeoCampaignProject } from "@/features/geo-campaign/types";
import { toProject } from "@/features/projects/project-mapper";
import { toGrowthSnapshot, GrowthServiceError } from "./snapshot.service";
import { buildGrowthTrend, metricDelta } from "./trend-engine";
import { GROWTH_RANGES, type CampaignGrowthImpact, type GrowthRange, type GrowthWorkspaceResponse } from "./types";

function toGrowthProject(row: Record<string, unknown>): GeoCampaignProject {
  const project = toProject(row);
  return { id: project.id, name: project.name, websiteUrl: project.websiteUrl, industry: project.industry, description: project.description, geoScore: project.geoScore, visibilityScore: project.visibilityScore, country: project.country };
}

export async function loadGrowthWorkspace(userId: string, requestedProjectId?: string | null, requestedRange?: string | null): Promise<GrowthWorkspaceResponse> {
  const projectRows = await prisma.project.findMany({ where: { userId } });
  const baseProjects = projectRows.map(toGrowthProject);
  const ownedIds = new Set(baseProjects.map((project) => project.id));
  if (requestedProjectId && !ownedIds.has(requestedProjectId)) throw new GrowthServiceError("PROJECT_FORBIDDEN", 403);
  const selectedProjectId = requestedProjectId ?? baseProjects[0]?.id ?? null;
  const allRows = await prisma.growthSnapshot.findManyForUser({ where: { userId, limit: 1000 } });
  const allSnapshots = allRows.map(toGrowthSnapshot);
  const snapshots = selectedProjectId ? allSnapshots.filter((snapshot) => snapshot.projectId === selectedProjectId) : [];
  const range = GROWTH_RANGES.includes(requestedRange as GrowthRange) ? requestedRange as GrowthRange : "30d";
  const campaigns = selectedProjectId ? (await prisma.geoCampaign.findManyForUser({ where: { userId, projectId: selectedProjectId } })).map(toGeoCampaign) : [];
  const campaignImpact = campaigns.map<CampaignGrowthImpact>((campaign) => {
    const campaignSnapshots = snapshots.filter((snapshot) => snapshot.campaignId === campaign.id);
    return {
      campaignId: campaign.id,
      campaignName: campaign.name,
      snapshotCount: campaignSnapshots.length,
      visibilityChange: metricDelta(campaignSnapshots, "visibilityScore"),
      overallChange: metricDelta(campaignSnapshots, "overallScore"),
    };
  }).filter((impact) => impact.snapshotCount > 0);
  const projects = baseProjects.map((project) => {
    const projectSnapshots = allSnapshots.filter((snapshot) => snapshot.projectId === project.id);
    const latest = [...projectSnapshots].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0] ?? null;
    return { ...project, snapshotCount: projectSnapshots.length, latestScore: latest?.overallScore ?? null, latestSnapshotAt: latest?.createdAt ?? null };
  });

  return { projects, selectedProjectId, snapshots, trend: buildGrowthTrend(snapshots, range), campaignImpact };
}


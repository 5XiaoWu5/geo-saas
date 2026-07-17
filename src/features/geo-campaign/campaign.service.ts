import { prisma } from "@/features/auth/server/prisma";
import { toProject } from "@/features/projects/project-mapper";
import { buildVisibilityAnalytics, emptyVisibilityAnalytics } from "@/features/visibility/analytics";
import { toVisibilityCheck, toVisibilityPrompt } from "@/features/visibility/mapper";
import type { VisibilityCampaign, VisibilityCheck, VisibilityPrompt } from "@/features/visibility/types";
import { toGrowthSnapshot } from "@/features/growth/snapshot.service";
import { metricDelta } from "@/features/growth/trend-engine";
import type { GrowthSnapshot } from "@/features/growth/types";
import { buildCampaignScore, buildCampaignSummary } from "./campaign-score";
import { clusterGeoQueries } from "./query-cluster";
import { generateGeoQueryDrafts } from "./query-generator";
import {
  GEO_CAMPAIGN_CATEGORIES,
  GEO_CAMPAIGN_PLATFORMS,
  GEO_CAMPAIGN_PRIORITIES,
  GEO_CAMPAIGN_STATUSES,
  GEO_QUERY_STATUSES,
  type GeoCampaign,
  type GeoCampaignCategory,
  type GeoCampaignCreateInput,
  type GeoCampaignPlatform,
  type GeoCampaignPriority,
  type GeoCampaignProject,
  type GeoCampaignStatus,
  type GeoCampaignWorkspaceResponse,
  type GeoCampaignWithRelations,
  type GeoQuery,
  type GeoQueryStatus,
} from "./types";

export class CampaignServiceError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

function enumValue<T extends readonly string[]>(values: T, value: unknown, fallback: T[number]): T[number] {
  const text = String(value ?? "");
  return values.includes(text) ? text as T[number] : fallback;
}

function toDateIso(value: unknown) {
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function toPlatforms(value: unknown): GeoCampaignPlatform[] {
  const values = Array.isArray(value) ? value : [];
  const platforms = values
    .map(String)
    .filter((platform): platform is GeoCampaignPlatform => GEO_CAMPAIGN_PLATFORMS.includes(platform as GeoCampaignPlatform));
  return platforms.length ? platforms : ["ChatGPT"];
}

export function toGeoCampaign(row: Record<string, unknown>): GeoCampaign {
  return {
    id: String(row.id),
    projectId: String(row.projectId),
    name: String(row.name),
    industry: String(row.industry),
    businessDescription: String(row.businessDescription ?? ""),
    goal: String(row.goal ?? ""),
    platforms: toPlatforms(row.platforms),
    queryCount: Number(row.queryCount ?? 0),
    status: enumValue(GEO_CAMPAIGN_STATUSES, row.status, "ACTIVE") as GeoCampaignStatus,
    createdAt: toDateIso(row.createdAt),
    updatedAt: toDateIso(row.updatedAt),
  };
}

export function toGeoQuery(row: Record<string, unknown>): GeoQuery {
  return {
    id: String(row.id),
    campaignId: String(row.campaignId),
    query: String(row.query),
    category: enumValue(GEO_CAMPAIGN_CATEGORIES, row.category, "recommendation") as GeoCampaignCategory,
    intent: String(row.intent ?? ""),
    priority: enumValue(GEO_CAMPAIGN_PRIORITIES, row.priority, "medium") as GeoCampaignPriority,
    status: enumValue(GEO_QUERY_STATUSES, row.status, "MONITORING") as GeoQueryStatus,
    createdAt: toDateIso(row.createdAt),
  };
}

function toCampaignProject(project: ReturnType<typeof toProject>): GeoCampaignProject {
  return {
    id: project.id,
    name: project.name,
    websiteUrl: project.websiteUrl,
    industry: project.industry,
    description: project.description,
    geoScore: project.geoScore,
    visibilityScore: project.visibilityScore,
    country: project.country,
  };
}

function toVisibilityCampaign(campaign: GeoCampaign): VisibilityCampaign {
  return {
    id: campaign.id,
    projectId: campaign.projectId,
    keyword: campaign.name,
    createdAt: campaign.createdAt,
  };
}

function queryToDraft(query: GeoQuery) {
  return {
    query: query.query,
    category: query.category,
    intent: query.intent,
    priority: query.priority,
  };
}

function latestCheck(checks: VisibilityCheck[]) {
  return [...checks].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0] ?? null;
}

async function ensureVisibilityCampaign(campaign: GeoCampaign, userId: string) {
  const existing = await prisma.visibilityCampaign.findFirstForUser({ where: { id: campaign.id, userId } });
  if (existing) return existing;
  return prisma.visibilityCampaign.create({ data: { id: campaign.id, projectId: campaign.projectId, keyword: campaign.name } });
}

async function ensurePromptsForQueries(userId: string, campaign: GeoCampaign, queries: GeoQuery[]) {
  await ensureVisibilityCampaign(campaign, userId);
  const prompts = (await prisma.visibilityPrompt.findManyForUser({ where: { userId, campaignIds: [campaign.id] } })).map(toVisibilityPrompt);
  const promptIds = new Set(prompts.map((prompt) => prompt.id));
  const created: VisibilityPrompt[] = [];

  for (const query of queries) {
    if (promptIds.has(query.id)) continue;
    const prompt = await prisma.visibilityPrompt.create({ data: { id: query.id, campaignId: campaign.id, prompt: query.query } });
    created.push(toVisibilityPrompt(prompt));
  }

  return [...prompts, ...created];
}

function buildCampaignRelations(campaigns: GeoCampaign[], queries: GeoQuery[], prompts: VisibilityPrompt[], checks: VisibilityCheck[], growthSnapshots: GrowthSnapshot[] = []) {
  return campaigns.map<GeoCampaignWithRelations>((campaign) => {
    const campaignQueries = queries.filter((query) => query.campaignId === campaign.id);
    const campaignPrompts = prompts.filter((prompt) => prompt.campaignId === campaign.id);
    const campaignChecks = checks.filter((check) => check.campaignId === campaign.id);
    const analytics = buildVisibilityAnalytics([toVisibilityCampaign(campaign)], campaignPrompts, campaignChecks);
    const score = buildCampaignScore(campaign, campaignQueries, campaignPrompts, analytics);
    const campaignGrowth = growthSnapshots.filter((snapshot) => snapshot.campaignId === campaign.id);
    return {
      ...campaign,
      queries: campaignQueries,
      clusters: clusterGeoQueries(campaignQueries.map(queryToDraft)),
      prompts: campaignPrompts,
      checks: campaignChecks,
      latestCheck: latestCheck(campaignChecks),
      trend: analytics.trend,
      score,
      growthImpact: {
        snapshotCount: campaignGrowth.length,
        visibilityChange: metricDelta(campaignGrowth, "visibilityScore"),
        overallChange: metricDelta(campaignGrowth, "overallScore"),
      },
    };
  });
}

export async function loadCampaignWorkspace(userId: string, requestedProjectId?: string | null, requestedCampaignId?: string | null): Promise<GeoCampaignWorkspaceResponse> {
  const projects = (await prisma.project.findMany({ where: { userId } })).map(toProject).map(toCampaignProject);
  const ownedProjectIds = new Set(projects.map((project) => project.id));

  let selectedProjectId = requestedProjectId && ownedProjectIds.has(requestedProjectId) ? requestedProjectId : projects[0]?.id ?? null;
  let requestedCampaign: GeoCampaign | null = null;
  if (requestedCampaignId) {
    const campaignRow = await prisma.geoCampaign.findFirstForUser({ where: { id: requestedCampaignId, userId } });
    if (campaignRow) {
      requestedCampaign = toGeoCampaign(campaignRow);
      selectedProjectId = requestedCampaign.projectId;
    }
  }

  if (!selectedProjectId) {
    return {
      projects: [],
      selectedProjectId: null,
      selectedCampaignId: null,
      campaigns: [],
      summary: buildCampaignSummary([], emptyVisibilityAnalytics()),
      analytics: emptyVisibilityAnalytics(),
    };
  }

  const campaigns = (await prisma.geoCampaign.findManyForUser({ where: { userId, projectId: selectedProjectId } })).map(toGeoCampaign);
  const campaignIds = campaigns.map((campaign) => campaign.id);
  const queries = (await prisma.geoQuery.findManyForUser({ where: { userId, campaignIds } })).map(toGeoQuery);
  const prompts = (await prisma.visibilityPrompt.findManyForUser({ where: { userId, campaignIds } })).map(toVisibilityPrompt);
  const checks = (await prisma.visibilityCheck.findManyForUser({ where: { userId, campaignIds } })).map(toVisibilityCheck);
  const visibilityCampaigns = campaigns.map(toVisibilityCampaign);
  const analytics = buildVisibilityAnalytics(visibilityCampaigns, prompts, checks);
  const growthSnapshots = (await prisma.growthSnapshot.findManyForUser({ where: { userId, projectId: selectedProjectId, limit: 1000 } })).map(toGrowthSnapshot);
  const campaignsWithRelations = buildCampaignRelations(campaigns, queries, prompts, checks, growthSnapshots);
  const summary = buildCampaignSummary(campaignsWithRelations, analytics);
  const selectedCampaignId = requestedCampaign?.id
    ?? (requestedCampaignId && campaignsWithRelations.some((campaign) => campaign.id === requestedCampaignId) ? requestedCampaignId : null)
    ?? campaignsWithRelations[0]?.id
    ?? null;

  return {
    projects,
    selectedProjectId,
    selectedCampaignId,
    campaigns: campaignsWithRelations,
    summary,
    analytics,
  };
}

export async function loadCampaignDetail(userId: string, campaignId: string) {
  const campaignRow = await prisma.geoCampaign.findFirstForUser({ where: { id: campaignId, userId } });
  if (!campaignRow) throw new CampaignServiceError("CAMPAIGN_NOT_FOUND", 404);

  const campaign = toGeoCampaign(campaignRow);
  const projectRow = await prisma.project.findFirst({ where: { id: campaign.projectId, userId } });
  if (!projectRow) throw new CampaignServiceError("PROJECT_FORBIDDEN", 403);

  const project = toCampaignProject(toProject(projectRow));
  const queries = (await prisma.geoQuery.findManyForUser({ where: { userId, campaignId: campaign.id } })).map(toGeoQuery);
  const prompts = (await prisma.visibilityPrompt.findManyForUser({ where: { userId, campaignIds: [campaign.id] } })).map(toVisibilityPrompt);
  const checks = (await prisma.visibilityCheck.findManyForUser({ where: { userId, campaignIds: [campaign.id] } })).map(toVisibilityCheck);
  const analytics = buildVisibilityAnalytics([toVisibilityCampaign(campaign)], prompts, checks);
  const growthSnapshots = (await prisma.growthSnapshot.findManyForUser({ where: { userId, campaignId: campaign.id, limit: 1000 } })).map(toGrowthSnapshot);
  const campaignWithRelations = buildCampaignRelations([campaign], queries, prompts, checks, growthSnapshots)[0];
  const summary = buildCampaignSummary([campaignWithRelations], analytics);

  return { project, campaign: campaignWithRelations, summary, analytics };
}

export async function createGeoCampaign(userId: string, input: GeoCampaignCreateInput) {
  const projectRow = await prisma.project.findFirst({ where: { id: input.projectId, userId } });
  if (!projectRow) throw new CampaignServiceError("PROJECT_FORBIDDEN", 403);

  const campaignId = crypto.randomUUID();
  const campaign = toGeoCampaign(await prisma.geoCampaign.create({
    data: {
      id: campaignId,
      projectId: input.projectId,
      name: input.name,
      industry: input.industry,
      businessDescription: input.businessDescription,
      goal: input.goal,
      platforms: input.platforms,
      queryCount: input.queryCount,
      status: "ACTIVE",
    },
  }));
  await ensureVisibilityCampaign(campaign, userId);

  return { project: toCampaignProject(toProject(projectRow)), campaign };
}

export async function generateQueriesForCampaign(userId: string, campaignId: string, targetCustomers = "", requestedCount?: number) {
  const campaignRow = await prisma.geoCampaign.findFirstForUser({ where: { id: campaignId, userId } });
  if (!campaignRow) throw new CampaignServiceError("CAMPAIGN_NOT_FOUND", 404);

  const campaign = toGeoCampaign(campaignRow);
  const projectRow = await prisma.project.findFirst({ where: { id: campaign.projectId, userId } });
  if (!projectRow) throw new CampaignServiceError("PROJECT_FORBIDDEN", 403);
  const project = toProject(projectRow);

  const currentQueries = (await prisma.geoQuery.findManyForUser({ where: { userId, campaignId: campaign.id } })).map(toGeoQuery);
  const targetCount = Math.max(1, Math.min(500, requestedCount ?? campaign.queryCount ?? 50));
  const existingQueryText = new Set(currentQueries.map((query) => query.query));
  const drafts = generateGeoQueryDrafts({
    projectId: campaign.projectId,
    name: campaign.name,
    industry: campaign.industry,
    businessDescription: campaign.businessDescription,
    goal: campaign.goal,
    targetCustomers,
    platforms: campaign.platforms,
    queryCount: targetCount,
    projectName: project.name,
    projectCountry: project.country,
  });
  const newDrafts = drafts.filter((draft) => !existingQueryText.has(draft.query)).slice(0, Math.max(0, targetCount - currentQueries.length));
  const newQueries = await prisma.geoQuery.createMany({
    data: newDrafts.map((draft) => ({
      id: crypto.randomUUID(),
      campaignId: campaign.id,
      query: draft.query,
      category: draft.category,
      intent: draft.intent,
      priority: draft.priority,
      status: "MONITORING",
    })),
  });

  const allQueries = [...currentQueries, ...newQueries.map(toGeoQuery)];
  await ensurePromptsForQueries(userId, campaign, allQueries);
  await prisma.geoCampaign.update({ where: { id: campaign.id, userId }, data: { queryCount: Math.max(targetCount, allQueries.length), status: "ACTIVE" } });

  return loadCampaignDetail(userId, campaign.id);
}

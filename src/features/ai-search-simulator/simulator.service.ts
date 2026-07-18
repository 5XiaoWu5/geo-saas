import { prisma } from "@/features/auth/server/prisma";
import { toEntityProfile } from "@/features/entity/mapper";
import { toGeoAnalysis } from "@/features/geo-analysis/server/analysis-mapper";
import { toGeoBrainAnalysis } from "@/features/geo-brain/mapper";
import { toGeoCampaign, toGeoQuery } from "@/features/geo-campaign/campaign.service";
import type { GeoCampaignProject } from "@/features/geo-campaign/types";
import { toProject } from "@/features/projects/project-mapper";
import { buildVisibilityAnalytics } from "@/features/visibility/analytics";
import { toVisibilityCampaign, toVisibilityCheck, toVisibilityPrompt } from "@/features/visibility/mapper";
import { toWebsiteScan } from "@/features/website-crawl/server/scan-mapper";
import { simulationProviderManager } from "./provider/provider-manager";
import {
  SIMULATION_PROVIDERS,
  SIMULATION_SIGNAL_CODES,
  SIMULATION_STATUSES,
  type RunSimulationInput,
  type SimulationProviderName,
  type SimulationRecord,
  type SimulationResult,
  type SimulationSignalCode,
  type SimulationTask,
  type SimulatorWorkspaceResponse,
} from "./types";
import { calculateSimulationTrend } from "./visibility-engine";
import { captureGrowthSnapshot } from "@/features/growth/snapshot.service";

export class SimulatorServiceError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

function iso(value: unknown) {
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function enumValue<T extends readonly string[]>(values: T, value: unknown, fallback: T[number]) {
  const normalized = String(value ?? "");
  return values.includes(normalized) ? normalized as T[number] : fallback;
}

function stringArray<T extends string>(values: readonly T[], value: unknown): T[] {
  const source = Array.isArray(value) ? value.map(String) : [];
  return source.filter((item): item is T => values.includes(item as T));
}

export function toSimulationTask(row: Record<string, unknown>): SimulationTask {
  return {
    id: String(row.id),
    projectId: String(row.projectId),
    campaignId: row.campaignId ? String(row.campaignId) : null,
    queryId: row.queryId ? String(row.queryId) : null,
    query: String(row.query ?? ""),
    provider: enumValue(SIMULATION_PROVIDERS, row.provider, "ChatGPT"),
    targetType: row.targetType === "COMPETITOR" ? "COMPETITOR" : "OWN",
    competitorId: row.competitorId ? String(row.competitorId) : null,
    status: enumValue(SIMULATION_STATUSES, row.status, "PENDING"),
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

export function toSimulationResult(row: Record<string, unknown>): SimulationResult {
  return {
    id: String(row.id),
    taskId: String(row.taskId),
    probability: Number(row.probability ?? 0),
    ranking: typeof row.ranking === "number" ? row.ranking : row.ranking ? Number(row.ranking) : null,
    confidence: Number(row.confidence ?? 0),
    entityScore: Number(row.entityScore ?? 0),
    schemaScore: Number(row.schemaScore ?? 0),
    authorityScore: Number(row.authorityScore ?? 0),
    citationScore: Number(row.citationScore ?? 0),
    mentioned: Boolean(row.mentioned),
    reasons: stringArray<SimulationSignalCode>(SIMULATION_SIGNAL_CODES, row.reasons),
    missing: stringArray<SimulationSignalCode>(SIMULATION_SIGNAL_CODES, row.missing),
    createdAt: iso(row.createdAt),
  };
}

function toCampaignProject(row: Record<string, unknown>): GeoCampaignProject {
  const project = toProject(row);
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

async function recordsForTasks(taskRows: Record<string, unknown>[]) {
  const tasks = taskRows.map(toSimulationTask);
  const resultRows = await prisma.simulationResult.findManyForTasks({ where: { taskIds: tasks.map((task) => task.id) } });
  const results = new Map(resultRows.map((row) => {
    const result = toSimulationResult(row);
    return [result.taskId, result] as const;
  }));
  return calculateSimulationTrend(tasks.map<SimulationRecord>((task) => ({ ...task, result: results.get(task.id) ?? null, trend: null })));
}

async function loadEvidence(userId: string, input: RunSimulationInput) {
  const projectRow = await prisma.project.findFirst({ where: { id: input.projectId, userId } });
  if (!projectRow) throw new SimulatorServiceError("PROJECT_FORBIDDEN", 403);

  const [scanRow, analysisRow, brainRow, entityRow, visibilityCampaignRows] = await Promise.all([
    prisma.websiteScan.findLatest({ where: { projectId: input.projectId } }),
    prisma.geoAnalysis.findLatest({ where: { projectId: input.projectId } }),
    prisma.geoBrainAnalysis.findLatestForProject({ where: { projectId: input.projectId, userId } }),
    prisma.entityProfile.findFirstForProject({ where: { projectId: input.projectId, userId } }),
    prisma.visibilityCampaign.findManyForUser({ where: { projectId: input.projectId, userId } }),
  ]);
  if (!scanRow || !analysisRow) throw new SimulatorServiceError("ANALYSIS_REQUIRED", 409);

  let campaign = null;
  if (input.campaignId) {
    const campaignRow = await prisma.geoCampaign.findFirstForUser({ where: { id: input.campaignId, userId } });
    if (!campaignRow || String(campaignRow.projectId) !== input.projectId) throw new SimulatorServiceError("CAMPAIGN_FORBIDDEN", 403);
    campaign = toGeoCampaign(campaignRow);
  }

  let geoQuery = null;
  if (input.queryId) {
    const queryRow = await prisma.geoQuery.findFirstForUser({ where: { id: input.queryId, userId, campaignId: input.campaignId ?? undefined } });
    if (!queryRow) throw new SimulatorServiceError("QUERY_FORBIDDEN", 403);
    geoQuery = toGeoQuery(queryRow);
    const queryCampaignRow = await prisma.geoCampaign.findFirstForUser({ where: { id: geoQuery.campaignId, userId } });
    if (!queryCampaignRow || String(queryCampaignRow.projectId) !== input.projectId) throw new SimulatorServiceError("QUERY_FORBIDDEN", 403);
    const queryCampaign = toGeoCampaign(queryCampaignRow);
    if (campaign && queryCampaign.id !== campaign.id) throw new SimulatorServiceError("QUERY_FORBIDDEN", 403);
    campaign = queryCampaign;
  }

  const campaignIds = visibilityCampaignRows.map((row) => String(row.id));
  const [promptRows, checkRows] = await Promise.all([
    prisma.visibilityPrompt.findManyForUser({ where: { userId, campaignIds } }),
    prisma.visibilityCheck.findManyForUser({ where: { userId, campaignIds } }),
  ]);
  const visibility = buildVisibilityAnalytics(
    visibilityCampaignRows.map(toVisibilityCampaign),
    promptRows.map(toVisibilityPrompt),
    checkRows.map(toVisibilityCheck),
  );

  return {
    project: toCampaignProject(projectRow),
    scan: toWebsiteScan(scanRow),
    analysis: toGeoAnalysis(analysisRow),
    brainAnalysis: brainRow ? toGeoBrainAnalysis(brainRow) : null,
    entityProfile: entityRow ? toEntityProfile(entityRow) : null,
    visibility,
    campaign,
    geoQuery,
  };
}

export async function loadSimulatorWorkspace(userId: string, requestedProjectId?: string | null, requestedCampaignId?: string | null, requestedQueryId?: string | null): Promise<SimulatorWorkspaceResponse> {
  const projects = (await prisma.project.findMany({ where: { userId } })).map(toCampaignProject);
  const ownedProjectIds = new Set(projects.map((project) => project.id));
  const selectedProjectId = requestedProjectId && ownedProjectIds.has(requestedProjectId) ? requestedProjectId : projects[0]?.id ?? null;
  const campaignRows = selectedProjectId ? await prisma.geoCampaign.findManyForUser({ where: { userId, projectId: selectedProjectId } }) : [];
  const campaigns = campaignRows.map(toGeoCampaign);
  const campaignIds = campaigns.map((campaign) => campaign.id);
  const queries = (await prisma.geoQuery.findManyForUser({ where: { userId, campaignIds } })).map(toGeoQuery);
  const selectedCampaignId = requestedCampaignId && campaigns.some((campaign) => campaign.id === requestedCampaignId)
    ? requestedCampaignId
    : campaigns[0]?.id ?? null;
  const selectedQueryId = requestedQueryId && queries.some((query) => query.id === requestedQueryId)
    ? requestedQueryId
    : queries.find((query) => query.campaignId === selectedCampaignId)?.id ?? null;
  const taskRows = selectedProjectId ? await prisma.simulationTask.findManyForUser({ where: { userId, projectId: selectedProjectId, limit: 100 } }) : [];
  const history = await recordsForTasks(taskRows);
  const latestByProvider = new Map<SimulationProviderName, SimulationRecord>();
  for (const record of history) if (!latestByProvider.has(record.provider) && record.status === "COMPLETED") latestByProvider.set(record.provider, record);

  return {
    projects,
    campaigns,
    queries,
    selectedProjectId,
    selectedCampaignId,
    selectedQueryId,
    history,
    latest: [...latestByProvider.values()],
  };
}

export async function runSimulation(userId: string, input: RunSimulationInput) {
  const query = input.query.trim();
  const providers = [...new Set(input.providers)].filter((provider): provider is SimulationProviderName => SIMULATION_PROVIDERS.includes(provider));
  if (!input.projectId || query.length < 3 || !providers.length) throw new SimulatorServiceError("INVALID_SIMULATION_INPUT", 400);
  if ((input.targetType ?? "OWN") !== "OWN" || input.competitorId) throw new SimulatorServiceError("COMPETITOR_SIMULATION_NOT_READY", 409);
  const evidence = await loadEvidence(userId, { ...input, query, providers });
  const effectiveQuery = evidence.geoQuery?.query ?? query;
  const records: SimulationRecord[] = [];

  for (const providerName of providers) {
    const taskRow = await prisma.simulationTask.create({
      data: {
        projectId: input.projectId,
        campaignId: evidence.campaign?.id ?? null,
        queryId: evidence.geoQuery?.id ?? null,
        query: effectiveQuery,
        provider: providerName,
        targetType: "OWN",
        competitorId: null,
        status: "RUNNING",
      },
    });
    const task = toSimulationTask(taskRow);
    try {
      const resultDraft = await simulationProviderManager.get(providerName).simulate({
        projectId: input.projectId,
        campaignId: evidence.campaign?.id,
        queryId: evidence.geoQuery?.id,
        query: effectiveQuery,
        provider: providerName,
        evidence,
      });
      const result = toSimulationResult(await prisma.simulationResult.create({ data: { taskId: task.id, ...resultDraft } }));
      const completedTask = toSimulationTask(await prisma.simulationTask.updateStatus({ where: { id: task.id, userId }, data: { status: "COMPLETED" } }));
      await captureGrowthSnapshot(userId, { projectId: task.projectId, eventType: "SIMULATION", sourceId: result.id, triggerType: "AUTO" });
      records.push({ ...completedTask, result, trend: null });
    } catch {
      const failedTask = await prisma.simulationTask.updateStatus({ where: { id: task.id, userId }, data: { status: "FAILED" } });
      if (failedTask) records.push({ ...toSimulationTask(failedTask), result: null, trend: null });
    }
  }

  if (!records.some((record) => record.status === "COMPLETED")) throw new SimulatorServiceError("SIMULATION_FAILED", 500);
  return { results: records };
}

export async function loadSimulationHistory(userId: string, projectId?: string | null) {
  if (projectId) {
    const project = await prisma.project.findFirst({ where: { id: projectId, userId } });
    if (!project) throw new SimulatorServiceError("PROJECT_FORBIDDEN", 403);
  }
  const taskRows = await prisma.simulationTask.findManyForUser({ where: { userId, projectId: projectId ?? undefined, limit: 150 } });
  return { history: await recordsForTasks(taskRows) };
}

export async function loadSimulationDetail(userId: string, id: string) {
  const taskRow = await prisma.simulationTask.findByIdForUser({ where: { id, userId } });
  if (!taskRow) {
    const exists = await prisma.simulationTask.exists({ where: { id } });
    throw new SimulatorServiceError(exists ? "SIMULATION_FORBIDDEN" : "SIMULATION_NOT_FOUND", exists ? 403 : 404);
  }
  const resultRow = await prisma.simulationResult.findByTaskId({ where: { taskId: id } });
  return { simulation: { ...toSimulationTask(taskRow), result: resultRow ? toSimulationResult(resultRow) : null, trend: null } };
}

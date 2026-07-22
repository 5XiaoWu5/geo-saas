import { prisma } from "@/features/auth/server/prisma";
import { buildVisibilityAnalytics } from "@/features/visibility/analytics";
import { toVisibilityCampaign, toVisibilityCheck, toVisibilityPrompt } from "@/features/visibility/mapper";
import { buildGrowthMetrics, calculateEntityCompleteness } from "./score-history";
import { GROWTH_EVENT_TYPES, GROWTH_TRIGGER_TYPES, type CreateGrowthSnapshotInput, type GrowthSnapshot } from "./types";
import { realAISearchDatabase } from "@/features/real-ai-search/database";

export class GrowthServiceError extends Error {
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

export function toGrowthSnapshot(row: Record<string, unknown>): GrowthSnapshot {
  const metadata = row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata) ? row.metadata as Record<string, unknown> : {};
  const numberOrNull = (value: unknown) => typeof value === "number" ? value : value === null || value === undefined ? null : Number(value);
  return {
    id: String(row.id),
    projectId: String(row.projectId),
    campaignId: row.campaignId ? String(row.campaignId) : null,
    simulationId: row.simulationId ? String(row.simulationId) : null,
    eventType: enumValue(GROWTH_EVENT_TYPES, row.eventType, "SCAN"),
    triggerType: enumValue(GROWTH_TRIGGER_TYPES, row.triggerType, "AUTO"),
    sourceId: String(row.sourceId),
    visibilityScore: numberOrNull(row.visibilityScore),
    entityScore: numberOrNull(row.entityScore),
    schemaScore: numberOrNull(row.schemaScore),
    authorityScore: numberOrNull(row.authorityScore),
    citationScore: numberOrNull(row.citationScore),
    overallScore: numberOrNull(row.overallScore),
    metadata,
    createdAt: iso(row.createdAt),
  };
}

async function validateSource(userId: string, input: CreateGrowthSnapshotInput) {
  if (input.eventType === "SCAN") {
    const analysis = await prisma.geoAnalysis.findByIdForProject({ where: { id: input.sourceId, projectId: input.projectId, userId } });
    if (!analysis) throw new GrowthServiceError("GROWTH_SOURCE_NOT_FOUND", 404);
    return { campaignId: null, simulationId: null, metadata: { analysisId: analysis.id, scanId: analysis.scanId } };
  }
  if (input.eventType === "ENTITY") {
    const profile = await prisma.entityProfile.findFirstForProject({ where: { projectId: input.projectId, userId } });
    const expectedSourceId = profile ? `${profile.id}:${iso(profile.updatedAt)}` : "";
    if (!profile || expectedSourceId !== input.sourceId) throw new GrowthServiceError("GROWTH_SOURCE_NOT_FOUND", 404);
    return { campaignId: null, simulationId: null, metadata: { profileId: profile.id, profileUpdatedAt: iso(profile.updatedAt) } };
  }
  if (input.eventType === "SIMULATION") {
    const result = await prisma.simulationResult.findByIdForUser({ where: { id: input.sourceId, userId } });
    if (!result) throw new GrowthServiceError("GROWTH_SOURCE_NOT_FOUND", 404);
    const task = await prisma.simulationTask.findByIdForUser({ where: { id: String(result.taskId), userId } });
    if (!task || String(task.projectId) !== input.projectId) throw new GrowthServiceError("GROWTH_SOURCE_NOT_FOUND", 404);
    return { campaignId: task.campaignId ? String(task.campaignId) : null, simulationId: String(result.id), metadata: { provider: task.provider, query: task.query, taskId: task.id } };
  }
  if (input.eventType === "VISIBILITY") {
    const check = await prisma.visibilityCheck.findByIdForUser({ where: { id: input.sourceId, userId } });
    if (!check) throw new GrowthServiceError("GROWTH_SOURCE_NOT_FOUND", 404);
    const campaign = await prisma.visibilityCampaign.findFirstForUser({ where: { id: String(check.campaignId), userId } });
    if (!campaign || String(campaign.projectId) !== input.projectId) throw new GrowthServiceError("GROWTH_SOURCE_NOT_FOUND", 404);
    const geoCampaign = await prisma.geoCampaign.findFirstForUser({ where: { id: String(campaign.id), userId } });
    return { campaignId: geoCampaign && String(geoCampaign.projectId) === input.projectId ? String(geoCampaign.id) : null, simulationId: null, metadata: { visibilityCampaignId: campaign.id, provider: check.provider, prompt: check.prompt, mentioned: check.brandMentioned } };
  }
  if (input.eventType === "AI_SEARCH") {
    const result = (await realAISearchDatabase().query('SELECT result."id", result."provider", result."status", result."mentioned", result."rankPosition" FROM "AISearchResult" result INNER JOIN "Project" p ON p."id" = result."projectId" WHERE result."id" = $1 AND result."projectId" = $2 AND p."userId" = $3 LIMIT 1', [input.sourceId, input.projectId, userId]))[0];
    if (!result) throw new GrowthServiceError("GROWTH_SOURCE_NOT_FOUND", 404);
    return { campaignId: null, simulationId: null, metadata: { aiSearchResultId: result.id, provider: result.provider, status: result.status, mentioned: result.mentioned, rankPosition: result.rankPosition } };
  }
  const task = await prisma.optimizationTask.findById({ where: { id: input.sourceId, userId } });
  if (!task || String(task.projectId) !== input.projectId || String(task.status) !== "COMPLETED") throw new GrowthServiceError("GROWTH_SOURCE_NOT_FOUND", 404);
  return { campaignId: null, simulationId: null, metadata: { taskId: task.id, status: task.status, category: task.category } };
}

async function loadCurrentMetrics(userId: string, projectId: string) {
  const [analysis, brain, profile, visibilityCampaignRows, simulationTaskRows] = await Promise.all([
    prisma.geoAnalysis.findLatest({ where: { projectId } }),
    prisma.geoBrainAnalysis.findLatestForProject({ where: { projectId, userId } }),
    prisma.entityProfile.findFirstForProject({ where: { projectId, userId } }),
    prisma.visibilityCampaign.findManyForUser({ where: { projectId, userId } }),
    prisma.simulationTask.findManyForUser({ where: { projectId, userId, limit: 100 } }),
  ]);
  const campaignIds = visibilityCampaignRows.map((row) => String(row.id));
  const [promptRows, checkRows, simulationResultRows] = await Promise.all([
    prisma.visibilityPrompt.findManyForUser({ where: { userId, campaignIds } }),
    prisma.visibilityCheck.findManyForUser({ where: { userId, campaignIds } }),
    prisma.simulationResult.findManyForTasks({ where: { taskIds: simulationTaskRows.map((row) => String(row.id)) } }),
  ]);
  const visibility = buildVisibilityAnalytics(visibilityCampaignRows.map(toVisibilityCampaign), promptRows.map(toVisibilityPrompt), checkRows.map(toVisibilityCheck));
  const resultByTaskId = new Map(simulationResultRows.map((row) => [String(row.taskId), row]));
  const latestSimulation = simulationTaskRows.map((task) => resultByTaskId.get(String(task.id))).find(Boolean) ?? null;
  const scoreDetails = brain?.scoreDetails && typeof brain.scoreDetails === "object" && !Array.isArray(brain.scoreDetails) ? brain.scoreDetails as Record<string, unknown> : {};
  const finiteScore = (value: unknown) => {
    const score = typeof value === "number" ? value : Number(value);
    return Number.isFinite(score) ? score : undefined;
  };

  return buildGrowthMetrics({
    analysis: analysis ? { totalScore: Number(analysis.totalScore), entityScore: Number(analysis.entityScore), schemaScore: Number(analysis.schemaScore) } : null,
    entityCompleteness: calculateEntityCompleteness(profile),
    brain: brain ? { authorityScore: finiteScore(scoreDetails.authorityScore), citationScore: finiteScore(scoreDetails.citationScore) } : null,
    simulation: latestSimulation ? {
      probability: Number(latestSimulation.probability),
      entityScore: Number(latestSimulation.entityScore),
      schemaScore: Number(latestSimulation.schemaScore),
      authorityScore: Number(latestSimulation.authorityScore),
      citationScore: Number(latestSimulation.citationScore),
    } : null,
    visibility: { averageScore: visibility.averageScore, brandMentionRate: visibility.brandMentionRate, totalChecks: visibility.totalChecks },
  });
}

export async function createGrowthSnapshot(userId: string, input: CreateGrowthSnapshotInput) {
  if (!GROWTH_EVENT_TYPES.includes(input.eventType) || !GROWTH_TRIGGER_TYPES.includes(input.triggerType ?? "AUTO") || !input.projectId || !input.sourceId) {
    throw new GrowthServiceError("INVALID_GROWTH_INPUT", 400);
  }
  const project = await prisma.project.findFirst({ where: { id: input.projectId, userId } });
  if (!project) throw new GrowthServiceError("PROJECT_FORBIDDEN", 403);
  const [source, metrics] = await Promise.all([validateSource(userId, input), loadCurrentMetrics(userId, input.projectId)]);
  const snapshot = await prisma.growthSnapshot.upsertForUser({
    where: { projectId: input.projectId, eventType: input.eventType, sourceId: input.sourceId, userId },
    data: { ...source, ...metrics, triggerType: input.triggerType ?? "AUTO" },
  });
  if (!snapshot) throw new GrowthServiceError("PROJECT_FORBIDDEN", 403);
  return toGrowthSnapshot(snapshot);
}

export async function captureGrowthSnapshot(userId: string, input: CreateGrowthSnapshotInput) {
  try {
    return await createGrowthSnapshot(userId, { ...input, triggerType: input.triggerType ?? "AUTO" });
  } catch (error) {
    console.error("[GROWTH SNAPSHOT]", input.eventType, input.sourceId, error);
    return null;
  }
}

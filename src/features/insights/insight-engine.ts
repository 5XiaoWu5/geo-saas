import { prisma } from "@/features/auth/server/prisma";
import { toEntityProfile } from "@/features/entity/mapper";
import { toGeoCampaign } from "@/features/geo-campaign/campaign.service";
import { toGeoAnalysis } from "@/features/geo-analysis/server/analysis-mapper";
import { toGrowthSnapshot } from "@/features/growth/snapshot.service";
import { toOptimizationTask } from "@/features/optimization/mapper";
import { toProject } from "@/features/projects/project-mapper";
import { toSimulationResult, toSimulationTask } from "@/features/ai-search-simulator/simulator.service";
import { toVisibilityCheck } from "@/features/visibility/mapper";
import { analyzeSignals } from "./signal-analyzer";
import type { InsightRecommendation, InsightScoreAnchor, InsightSourceType, InsightsResponse, ProjectInsight } from "./types";

export class InsightEngineError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

function validScore(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 100;
}

function confidenceForSignals(signals: ProjectInsight["positiveSignals"], deductions: ProjectInsight["negativeSignals"]) {
  const all = [...signals, ...deductions];
  const total = all.reduce((sum, signal) => sum + signal.value, 0);
  if (!total) return 100;
  return Math.round(all.reduce((sum, signal) => sum + signal.confidence * signal.value, 0) / total);
}

export function insightIssueId(projectId: string, signalKey: string) {
  return `insight:${projectId}:${signalKey}`;
}

function recommendationFor(projectId: string, signal: ProjectInsight["negativeSignals"][number], existingTasks: ReturnType<typeof toOptimizationTask>[]): InsightRecommendation {
  const issueId = insightIssueId(projectId, signal.signalKey);
  return {
    signalKey: signal.signalKey,
    issueId,
    targetModule: "optimization",
    existingTask: existingTasks.find((task) => task.issueId === issueId) ?? null,
    deepLink: `/optimization?projectId=${encodeURIComponent(projectId)}&issueId=${encodeURIComponent(issueId)}`,
  };
}

function unavailableSources(values: Array<[InsightSourceType, unknown]>) {
  return values.filter(([, value]) => !value).map(([sourceType]) => ({ sourceType, available: false as const }));
}

export async function buildProjectInsight(userId: string, projectId: string): Promise<ProjectInsight> {
  const projectRow = await prisma.project.findFirst({ where: { id: projectId, userId } });
  if (!projectRow) throw new InsightEngineError("PROJECT_FORBIDDEN", 403);
  const project = toProject(projectRow);

  const [taskRows, growthRows, analysisRow, entityRow, visibilityCampaignRows, campaignRows, optimizationRows] = await Promise.all([
    prisma.simulationTask.findManyForUser({ where: { userId, projectId, limit: 200 } }),
    prisma.growthSnapshot.findManyForUser({ where: { userId, projectId, limit: 500 } }),
    prisma.geoAnalysis.findLatest({ where: { projectId } }),
    prisma.entityProfile.findFirstForProject({ where: { projectId, userId } }),
    prisma.visibilityCampaign.findManyForUser({ where: { projectId, userId } }),
    prisma.geoCampaign.findManyForUser({ where: { projectId, userId } }),
    prisma.optimizationTask.findManyForProject({ where: { projectId, userId } }),
  ]);
  const tasks = taskRows.map(toSimulationTask);
  const resultRows = await prisma.simulationResult.findManyForTasks({ where: { taskIds: tasks.map((task) => task.id) } });
  const results = resultRows.map(toSimulationResult);
  const resultByTaskId = new Map(results.map((result) => [result.taskId, result]));
  const latestSimulationTask = tasks.find((task) => task.status === "COMPLETED" && resultByTaskId.has(task.id)) ?? null;
  const simulation = latestSimulationTask ? resultByTaskId.get(latestSimulationTask.id) ?? null : null;
  const growthSnapshots = growthRows.map(toGrowthSnapshot);
  const growth = growthSnapshots.find((snapshot) => validScore(snapshot.overallScore)) ?? null;
  const analysis = analysisRow ? toGeoAnalysis(analysisRow) : null;

  let anchor: InsightScoreAnchor | null = null;
  if (simulation && validScore(simulation.probability)) anchor = { score: simulation.probability, sourceType: "SimulationResult", sourceId: simulation.id, createdAt: simulation.createdAt };
  else if (growth && validScore(growth.overallScore)) anchor = { score: growth.overallScore, sourceType: "GrowthSnapshot", sourceId: growth.id, createdAt: growth.createdAt };
  else if (analysis && validScore(analysis.totalScore)) anchor = { score: analysis.totalScore, sourceType: "GeoAnalysis", sourceId: analysis.id, createdAt: analysis.createdAt };

  const campaignIds = visibilityCampaignRows.map((row) => String(row.id));
  const visibilityRows = await prisma.visibilityCheck.findManyForUser({ where: { userId, campaignIds } });
  const visibilityChecks = visibilityRows.map(toVisibilityCheck);
  const entityProfile = entityRow ? toEntityProfile(entityRow) : null;
  const campaigns = campaignRows.map(toGeoCampaign);
  const tasksForOptimization = optimizationRows.map(toOptimizationTask);
  const unavailable = unavailableSources([
    ["SimulationResult", simulation],
    ["GrowthSnapshot", growth],
    ["GeoAnalysis", analysis],
    ["EntityProfile", entityProfile],
    ["VisibilityCheck", visibilityChecks[0]],
    ["GeoCampaign", campaigns[0]],
  ]);

  if (!anchor) {
    return { projectId, projectName: project.name, websiteUrl: project.websiteUrl, status: "unavailable", anchor: null, score: null, confidence: null, positiveSignals: [], negativeSignals: [], missingSignals: [], unavailableSources: unavailable, recommendations: [] };
  }

  const ledger = analyzeSignals({ anchor, simulation, growth, analysis, entityProfile, visibilityChecks, campaigns, simulationCampaignId: latestSimulationTask?.campaignId ?? null });
  if (!ledger.reconciled) {
    return { projectId, projectName: project.name, websiteUrl: project.websiteUrl, status: "unavailable", anchor, score: anchor.score, confidence: null, positiveSignals: [], negativeSignals: [], missingSignals: [], unavailableSources: unavailable, recommendations: [] };
  }

  const actionable = [...ledger.negativeSignals, ...ledger.missingSignals].filter((signal) => signal.targetModule === "optimization" || ["entity_gap", "schema_gap", "authority_gap", "citation_gap", "visibility_gap", "content_gap"].includes(signal.signalKey));
  return {
    projectId,
    projectName: project.name,
    websiteUrl: project.websiteUrl,
    status: "available",
    anchor,
    score: anchor.score,
    confidence: confidenceForSignals(ledger.positiveSignals, [...ledger.negativeSignals, ...ledger.missingSignals]),
    positiveSignals: ledger.positiveSignals,
    negativeSignals: ledger.negativeSignals,
    missingSignals: ledger.missingSignals,
    unavailableSources: unavailable,
    recommendations: actionable.map((signal) => recommendationFor(projectId, signal, tasksForOptimization)),
  };
}

export async function loadInsightsWorkspace(userId: string, requestedProjectId?: string | null): Promise<InsightsResponse> {
  const projects = (await prisma.project.findMany({ where: { userId } })).map(toProject);
  const selectedProjectId = requestedProjectId && projects.some((project) => project.id === requestedProjectId) ? requestedProjectId : projects[0]?.id ?? null;
  const insights = await Promise.all(projects.map((project) => buildProjectInsight(userId, project.id)));
  return { projects: projects.map((project) => ({ id: project.id, name: project.name, websiteUrl: project.websiteUrl })), selectedProjectId, insights };
}


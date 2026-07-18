import { prisma } from "@/features/auth/server/prisma";
import { toEntityProfile } from "@/features/entity/mapper";
import { toGeoCampaign } from "@/features/geo-campaign/campaign.service";
import { toGeoAnalysis } from "@/features/geo-analysis/server/analysis-mapper";
import { toGrowthSnapshot } from "@/features/growth/snapshot.service";
import { toOptimizationTask } from "@/features/optimization/mapper";
import { toProject } from "@/features/projects/project-mapper";
import { toSimulationResult, toSimulationTask } from "@/features/ai-search-simulator/simulator.service";
import { toVisibilityCheck } from "@/features/visibility/mapper";
import type { SimulationResult, SimulationTask } from "@/features/ai-search-simulator/types";
import type { EntityProfile } from "@/features/entity/types";
import type { GeoCampaign } from "@/features/geo-campaign/types";
import type { GeoAnalysis } from "@/features/geo-analysis/types";
import type { GrowthSnapshot } from "@/features/growth/types";
import type { OptimizationTask } from "@/features/optimization/types";
import type { VisibilityCheck } from "@/features/visibility/types";
import { getCompanyKnowledgeProfile } from "@/features/knowledge";
import type { KnowledgeIntelligenceResponse } from "@/features/knowledge/types";
import { loadOptionalInsightSource } from "./optional-source";
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
  const projectRow = await prisma.insightSource.projectForUser({ where: { id: projectId, userId } });
  if (!projectRow) throw new InsightEngineError("PROJECT_FORBIDDEN", 403);
  const project = toProject(projectRow);

  const [tasks, growthSnapshots, analysis, entityProfile, visibilityCampaignRows, campaigns, tasksForOptimization, knowledgeResponse] = await Promise.all([
    loadOptionalInsightSource<SimulationTask[]>("SimulationTask", async () => (await prisma.insightSource.simulationTasksForProject({ where: { userId, projectId, limit: 200 } })).map(toSimulationTask), []),
    loadOptionalInsightSource<GrowthSnapshot[]>("GrowthSnapshot", async () => (await prisma.insightSource.growthSnapshotsForProject({ where: { userId, projectId, limit: 500 } })).map(toGrowthSnapshot), []),
    loadOptionalInsightSource<GeoAnalysis | null>("GeoAnalysis", async () => {
      const row = await prisma.insightSource.geoAnalysisForProject({ where: { projectId, userId } });
      return row ? toGeoAnalysis(row) : null;
    }, null),
    loadOptionalInsightSource<EntityProfile | null>("EntityProfile", async () => {
      const row = await prisma.insightSource.entityProfileForProject({ where: { projectId, userId } });
      return row ? toEntityProfile(row) : null;
    }, null),
    loadOptionalInsightSource<Record<string, unknown>[]>("VisibilityCampaign", () => prisma.insightSource.visibilityCampaignsForProject({ where: { projectId, userId } }), []),
    loadOptionalInsightSource<GeoCampaign[]>("GeoCampaign", async () => (await prisma.insightSource.geoCampaignsForProject({ where: { projectId, userId } })).map(toGeoCampaign), []),
    loadOptionalInsightSource<OptimizationTask[]>("OptimizationTask", async () => (await prisma.insightSource.optimizationTasksForProject({ where: { projectId, userId } })).map(toOptimizationTask), []),
    loadOptionalInsightSource<KnowledgeIntelligenceResponse | null>("CompanyKnowledgeProfile", () => getCompanyKnowledgeProfile(userId, projectId), null),
  ]);
  const knowledgeProfile = knowledgeResponse?.profile ?? null;
  const knowledgeInsight = knowledgeProfile && knowledgeProfile.missingKnowledge.length ? {
    type: "KNOWLEDGE_GAP" as const,
    profileId: knowledgeProfile.id,
    confidence: knowledgeProfile.confidence,
    gaps: knowledgeProfile.missingKnowledge,
    targetModule: "knowledge" as const,
    deepLink: `/projects/${encodeURIComponent(projectId)}/knowledge/intelligence`,
  } : null;
  const results = await loadOptionalInsightSource<SimulationResult[]>("SimulationResult", async () => (await prisma.insightSource.simulationResultsForTasks({ where: { taskIds: tasks.map((task) => task.id) } })).map(toSimulationResult), []);
  const resultByTaskId = new Map(results.map((result) => [result.taskId, result]));
  const latestSimulationTask = tasks.find((task) => task.status === "COMPLETED" && resultByTaskId.has(task.id)) ?? null;
  const simulation = latestSimulationTask ? resultByTaskId.get(latestSimulationTask.id) ?? null : null;
  const growth = growthSnapshots.find((snapshot) => validScore(snapshot.overallScore)) ?? null;

  let anchor: InsightScoreAnchor | null = null;
  if (simulation && validScore(simulation.probability)) anchor = { score: simulation.probability, sourceType: "SimulationResult", sourceId: simulation.id, createdAt: simulation.createdAt };
  else if (growth && validScore(growth.overallScore)) anchor = { score: growth.overallScore, sourceType: "GrowthSnapshot", sourceId: growth.id, createdAt: growth.createdAt };
  else if (analysis && validScore(analysis.totalScore)) anchor = { score: analysis.totalScore, sourceType: "GeoAnalysis", sourceId: analysis.id, createdAt: analysis.createdAt };

  const campaignIds = visibilityCampaignRows.map((row) => String(row.id));
  const visibilityChecks = await loadOptionalInsightSource<VisibilityCheck[]>("VisibilityCheck", async () => (await prisma.insightSource.visibilityChecksForCampaigns({ where: { userId, campaignIds } })).map(toVisibilityCheck), []);
  const unavailable = unavailableSources([
    ["SimulationResult", simulation],
    ["GrowthSnapshot", growth],
    ["GeoAnalysis", analysis],
    ["EntityProfile", entityProfile],
    ["VisibilityCheck", visibilityChecks[0]],
    ["GeoCampaign", campaigns[0]],
  ]);

  if (!anchor) {
    return { projectId, projectName: project.name, websiteUrl: project.websiteUrl, status: "unavailable", anchor: null, score: null, confidence: null, positiveSignals: [], negativeSignals: [], missingSignals: [], unavailableSources: unavailable, recommendations: [], knowledgeInsight };
  }

  const ledger = analyzeSignals({ anchor, simulation, growth, analysis, entityProfile, visibilityChecks, campaigns, simulationCampaignId: latestSimulationTask?.campaignId ?? null });
  if (!ledger.reconciled) {
    return { projectId, projectName: project.name, websiteUrl: project.websiteUrl, status: "unavailable", anchor, score: anchor.score, confidence: null, positiveSignals: [], negativeSignals: [], missingSignals: [], unavailableSources: unavailable, recommendations: [], knowledgeInsight };
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
    knowledgeInsight,
  };
}

export async function loadInsightsWorkspace(userId: string, requestedProjectId?: string | null): Promise<InsightsResponse> {
  const projects = (await prisma.insightSource.projectsForUser({ where: { userId } })).map(toProject);
  const selectedProjectId = requestedProjectId && projects.some((project) => project.id === requestedProjectId) ? requestedProjectId : projects[0]?.id ?? null;
  const insights = await Promise.all(projects.map((project) => buildProjectInsight(userId, project.id)));
  return { projects: projects.map((project) => ({ id: project.id, name: project.name, websiteUrl: project.websiteUrl })), selectedProjectId, insights };
}

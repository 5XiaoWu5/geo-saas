import { createHash } from "node:crypto";
import { buildExecutiveSummary } from "./executive-summary.service";
import type { EvidenceStatus, GrowthReportEvidence, GrowthReportSnapshot, SnapshotModule } from "./types";
import { GROWTH_REPORT_METHOD_VERSION } from "./types";

function normalize<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
function array(value: unknown): unknown[] { if (Array.isArray(value)) return value; if (typeof value === "string") { try { const parsed = JSON.parse(value) as unknown; return Array.isArray(parsed) ? parsed : []; } catch { return []; } } return []; }
function number(value: unknown) { return value === null || value === undefined ? null : Number(value); }
function ids(values: Array<Record<string, unknown> | null>) { return values.flatMap((value) => value?.id ? [String(value.id)] : []); }
function module<T extends Record<string, unknown>>(generatedAt: string, sourceType: string[], sources: Array<Record<string, unknown> | null>, data: T | null, evidenceStatus: EvidenceStatus = "verified"): SnapshotModule<T> { return data ? { status: "available", sourceId: ids(sources), sourceType, generatedAt, evidenceStatus, data: normalize(data) } : { status: "unavailable", sourceId: [], sourceType, generatedAt, evidenceStatus: "unavailable" }; }
function analysisIssues(evidence: GrowthReportEvidence) { return array(evidence.analysis?.issues).filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object")); }

function competitorGaps(results: Record<string, unknown>[]) {
  const own = results.find((result) => result.targetType === "OWN");
  const competitor = results.find((result) => result.targetType === "COMPETITOR");
  if (!own || !competitor) return [];
  const metrics = ["overallScore", "visibilityScore", "entityScore", "schemaScore", "authorityScore", "citationScore", "simulationScore"];
  return metrics.flatMap((metric) => { const ownValue = number(own[metric]); const competitorValue = number(competitor[metric]); return ownValue !== null && competitorValue !== null && competitorValue > ownValue ? [{ metric, ownValue, competitorValue, difference: competitorValue - ownValue, competitorName: competitor.competitorName ?? competitor.targetKey }] : []; });
}

function opportunities(evidence: GrowthReportEvidence) {
  const issueOpportunities = analysisIssues(evidence).map((issue) => ({ sourceType: issue.category === "entity" ? "GEO_ANALYSIS" : "SEO_ANALYSIS", sourceId: evidence.analysis?.id, title: issue.title, description: issue.description, severity: issue.severity }));
  const missing = array(evidence.knowledge?.missingKnowledge).map((gap) => ({ sourceType: "KNOWLEDGE_GAP", sourceId: evidence.knowledge?.id, gap }));
  const gaps = competitorGaps(evidence.benchmarkResults).map((gap) => ({ sourceType: "BENCHMARK_GAP", sourceId: evidence.benchmarkRun?.id, ...gap }));
  return [...issueOpportunities, ...missing, ...gaps].slice(0, 10);
}

export function validateGrowthReportSnapshot(snapshot: GrowthReportSnapshot) {
  const keys: Array<keyof GrowthReportSnapshot> = ["reportMeta", "seoSnapshot", "geoSnapshot", "aiSearchSnapshot", "knowledgeSnapshot", "competitorSnapshot", "optimizationSnapshot", "insightSnapshot", "roadmapSnapshot"];
  for (const key of keys) if (!snapshot[key]) throw new Error(`REPORT_SNAPSHOT_MISSING_${String(key).toUpperCase()}`);
  for (const key of keys.slice(1)) { const value = snapshot[key] as SnapshotModule; if (!value.generatedAt || !Array.isArray(value.sourceId) || !Array.isArray(value.sourceType) || !["available", "unavailable"].includes(value.status)) throw new Error(`REPORT_SNAPSHOT_INVALID_${String(key).toUpperCase()}`); }
  return true;
}

export function buildGrowthReportSnapshot(input: { evidence: GrowthReportEvidence; reportId: string; version: number; generatedBy: string; generatedAt: string }) {
  const { evidence, generatedAt } = input;
  const issues = analysisIssues(evidence);
  const seoIssues = issues.filter((issue) => issue.category !== "entity");
  const geoIssues = issues.filter((issue) => issue.category === "entity");
  const successfulResults = evidence.aiResults.filter((result) => result.status === "SUCCEEDED");
  const opportunityRows = opportunities(evidence);
  const pendingTasks = evidence.optimizationTasks.filter((task) => task.status !== "COMPLETED");
  const seoSnapshot = module(generatedAt, ["WebsiteScan", "GeoAnalysis"], [evidence.scan, evidence.analysis], evidence.scan || evidence.analysis ? { seoScore: number(evidence.analysis?.totalScore), technicalScore: number(evidence.analysis?.technicalScore), contentScore: number(evidence.analysis?.contentScore), schemaScore: number(evidence.analysis?.schemaScore), scan: evidence.scan, technicalIssues: seoIssues } : null, evidence.scan && evidence.analysis ? "verified" : "partial");
  const geoSnapshot = module(generatedAt, ["GeoAnalysis", "EntityProfile", "VisibilityCheck"], [evidence.analysis, evidence.entity, ...evidence.visibilityChecks], evidence.analysis || evidence.entity || evidence.visibilityChecks.length ? { geoScore: number(evidence.analysis?.totalScore), entityScore: number(evidence.analysis?.entityScore), entity: evidence.entity, geoIssues, visibilityChecks: evidence.visibilityChecks, visibilityCitations: evidence.visibilityCitations } : null, evidence.entity && evidence.visibilityChecks.length ? "verified" : "partial");
  const aiSearchSnapshot = module(generatedAt, ["AISearchResult", "AISearchCitation", "AISearchGrowthScore"], [...evidence.aiResults, ...evidence.aiCitations, evidence.growthScore], evidence.aiResults.length || evidence.growthScore ? { results: evidence.aiResults, citations: evidence.aiCitations, growthScore: evidence.growthScore, successfulResultCount: successfulResults.length, mentionedCount: successfulResults.filter((result) => result.mentioned === true).length, citationCount: evidence.aiCitations.reduce((sum, citation) => sum + Number(citation.citationCount ?? 0), 0) } : null, evidence.aiResults.length && evidence.growthScore ? "verified" : "partial");
  const knowledgeSnapshot = module(generatedAt, ["CompanyKnowledgeBase", "CompanyKnowledgeProfile", "KnowledgeAssets"], [evidence.knowledge, evidence.knowledgeAssets], evidence.knowledge ? { profile: evidence.knowledge, assets: evidence.knowledgeAssets, completenessScore: number(evidence.knowledge.completenessScore), missingKnowledge: array(evidence.knowledge.missingKnowledge) } : null);
  const competitorSnapshot = module(generatedAt, ["BenchmarkRun", "BenchmarkResult"], [evidence.benchmarkRun, ...evidence.benchmarkResults], evidence.benchmarkRun ? { run: evidence.benchmarkRun, results: evidence.benchmarkResults, gaps: competitorGaps(evidence.benchmarkResults) } : null);
  const optimizationSnapshot = module(generatedAt, ["GrowthOpportunity", "OptimizationTask"], [...evidence.optimizationTasks, evidence.analysis, evidence.knowledge, evidence.benchmarkRun], evidence.optimizationTasks.length || opportunityRows.length ? { opportunities: opportunityRows, tasks: evidence.optimizationTasks, pendingCount: pendingTasks.length, completedCount: evidence.optimizationTasks.length - pendingTasks.length } : null, evidence.optimizationTasks.length ? "verified" : "partial");
  const insightSnapshot = module(generatedAt, ["GeoBrainAnalysis"], [evidence.insight], evidence.insight ? { insight: evidence.insight } : null);
  const roadmapSnapshot = module(generatedAt, ["OptimizationTask", "GrowthSnapshot"], [...pendingTasks.slice(0, 10), ...evidence.growthSnapshots], pendingTasks.length || evidence.growthSnapshots.length ? { topTasks: pendingTasks.slice(0, 10), growthTimeline: evidence.growthSnapshots } : null, pendingTasks.length ? "verified" : "partial");
  const sourceIds = [seoSnapshot, geoSnapshot, aiSearchSnapshot, knowledgeSnapshot, competitorSnapshot, optimizationSnapshot, insightSnapshot, roadmapSnapshot].flatMap((item) => item.sourceId).sort();
  const dataVersion = `gr-${input.version}-${createHash("sha256").update(JSON.stringify({ projectId: evidence.project.id, sourceIds, generatedAt })).digest("hex").slice(0, 16)}`;
  const base = { seoSnapshot, geoSnapshot, aiSearchSnapshot, knowledgeSnapshot, competitorSnapshot, optimizationSnapshot, insightSnapshot, roadmapSnapshot };
  const confidence = Math.round(([seoSnapshot, geoSnapshot, aiSearchSnapshot, knowledgeSnapshot, competitorSnapshot, optimizationSnapshot, insightSnapshot, roadmapSnapshot].filter((item) => item.status === "available").length / 8) * 100);
  const snapshot: GrowthReportSnapshot = { reportMeta: { projectId: String(evidence.project.id), projectName: String(evidence.project.name), domain: String(evidence.project.domain), version: input.version, generatedBy: input.generatedBy, generatedAt, dataVersion, methodVersion: GROWTH_REPORT_METHOD_VERSION, confidence, status: "COMPLETED", executiveSummary: buildExecutiveSummary(base) }, ...base };
  validateGrowthReportSnapshot(snapshot);
  return snapshot;
}

export function failedGrowthReportSnapshot(input: { projectId: string; projectName: string; domain: string; version: number; generatedBy: string; generatedAt: string; dataVersion: string; reason: string }): GrowthReportSnapshot {
  const unavailable = (sourceType: string[]): SnapshotModule => ({ status: "unavailable", sourceId: [], sourceType, generatedAt: input.generatedAt, evidenceStatus: "unavailable" });
  return { reportMeta: { projectId: input.projectId, projectName: input.projectName, domain: input.domain, version: input.version, generatedBy: input.generatedBy, generatedAt: input.generatedAt, dataVersion: input.dataVersion, methodVersion: GROWTH_REPORT_METHOD_VERSION, confidence: 0, status: "FAILED", executiveSummary: { status: "unavailable", currentState: [], priorities: [] }, failureReason: input.reason }, seoSnapshot: unavailable(["WebsiteScan", "GeoAnalysis"]), geoSnapshot: unavailable(["EntityProfile", "VisibilityCheck"]), aiSearchSnapshot: unavailable(["AISearchResult", "AISearchGrowthScore"]), knowledgeSnapshot: unavailable(["CompanyKnowledgeProfile"]), competitorSnapshot: unavailable(["BenchmarkResult"]), optimizationSnapshot: unavailable(["OptimizationTask"]), insightSnapshot: unavailable(["GeoBrainAnalysis"]), roadmapSnapshot: unavailable(["GrowthSnapshot"]) };
}

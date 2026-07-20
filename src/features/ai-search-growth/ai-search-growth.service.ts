import { AI_SEARCH_PROVIDER_TYPES, type AISearchProviderType } from "@/features/real-ai-search/types";
import { iso } from "@/features/real-ai-search/database";
import { calculateAISearchGrowthScore } from "./ai-search-growth-score.service";
import { explainAIRecommendation } from "./ai-recommendation-explanation.service";
import { aiSearchGrowthRepository, rowJsonArray, type AISearchGrowthEvidence } from "./repository";
import type { AISearchGrowthResponse, AISearchGrowthScoreInput, CompetitionMetric, CompetitionRow, EvidenceMetric, GrowthTrendPoint, ProviderVisibilitySummary, RoadmapTask } from "./types";

export class AISearchGrowthError extends Error { constructor(public code: string, public status: number) { super(code); } }
const unavailable = (): EvidenceMetric => ({ status: "unavailable", value: null, sourceIds: [] });
const metric = (value: number, sourceIds: string[]): EvidenceMetric => ({ status: "available", value: Math.max(0, Math.min(100, Math.round(value))), sourceIds });
const compareUnavailable = (unit: CompetitionMetric["unit"]): CompetitionMetric => ({ status: "unavailable", value: null, unit });
const compareMetric = (value: number | null | undefined, unit: CompetitionMetric["unit"]): CompetitionMetric => value === null || value === undefined ? compareUnavailable(unit) : { status: "available", value: Math.round(value), unit };
function strings(value: unknown) { return Array.isArray(value) ? value.map(String).filter(Boolean) : []; }
function populated(value: unknown) { return Array.isArray(value) ? value.length > 0 : String(value ?? "").trim().length > 0; }
function authorityScore(entity: Record<string, unknown> | null) { return entity ? Math.round([entity.brandName, entity.industry, entity.region, entity.description, entity.services, entity.products, entity.advantages].filter(populated).length / 7 * 100) : null; }

function buildScoreInput(evidence: AISearchGrowthEvidence): AISearchGrowthScoreInput {
  const sourceIds = evidence.results.map((row) => String(row.id));
  const mentions = evidence.results.filter((row) => row.mentioned === true).length;
  const cited = evidence.results.filter((row) => Number(row.citationCount ?? 0) > 0).length;
  const knowledgeValue = evidence.knowledge?.completenessScore === null || evidence.knowledge?.completenessScore === undefined ? null : Number(evidence.knowledge.completenessScore);
  const authority = authorityScore(evidence.entity);
  const own = evidence.benchmark.find((row) => String(row.targetType) === "OWN" && row.overallScore !== null);
  const competitors = evidence.benchmark.filter((row) => String(row.targetType) === "COMPETITOR" && row.overallScore !== null);
  const strongest = competitors.length ? Math.max(...competitors.map((row) => Number(row.overallScore))) : null;
  return {
    visibility: evidence.results.length ? metric(mentions / evidence.results.length * 100, sourceIds) : unavailable(),
    citation: evidence.results.length ? metric(cited / evidence.results.length * 100, sourceIds) : unavailable(),
    knowledge: knowledgeValue === null ? unavailable() : metric(knowledgeValue, [String(evidence.knowledge!.baseId)]),
    authority: authority === null ? unavailable() : metric(authority, [String(evidence.entity!.id)]),
    competition: own && strongest !== null ? metric(50 + (Number(own.overallScore) - strongest) / 2, [String(own.runId), String(own.id), ...competitors.map((row) => String(row.id))]) : unavailable(),
  };
}

function providerSummary(provider: AISearchProviderType, results: AISearchGrowthEvidence["results"]): ProviderVisibilitySummary {
  const rows = results.filter((row) => row.provider === provider);
  const ranks = rows.flatMap((row) => row.rankPosition === null || row.rankPosition === undefined ? [] : [Number(row.rankPosition)]);
  return { provider, status: rows.length ? "available" : "unavailable", successfulChecks: rows.length, mentionCount: rows.length ? rows.filter((row) => row.mentioned === true).length : null, citationCount: rows.length ? rows.reduce((total, row) => total + Number(row.citationCount ?? 0), 0) : null, averageRank: ranks.length ? Math.round(ranks.reduce((total, rank) => total + rank, 0) / ranks.length * 10) / 10 : null };
}

function comparisonRows(evidence: AISearchGrowthEvidence): CompetitionRow[] {
  const successful = evidence.results.length;
  const targetMentions = evidence.results.filter((row) => row.mentioned === true).length;
  const targetCitations = evidence.results.reduce((total, row) => total + Number(row.citationCount ?? 0), 0);
  const productNames = evidence.products.map((row) => String(row.name).toLocaleLowerCase());
  const mentionedProducts = new Set(evidence.results.flatMap((row) => strings(row.productMentions).map((name) => name.toLocaleLowerCase())).filter((name) => productNames.includes(name)));
  const ownBenchmark = evidence.benchmark.find((row) => String(row.targetType) === "OWN");
  const latestProbability = evidence.evaluation?.recommendationProbability === null || evidence.evaluation?.recommendationProbability === undefined ? null : Number(evidence.evaluation.recommendationProbability);
  const knowledgeValue = evidence.knowledge?.completenessScore === null || evidence.knowledge?.completenessScore === undefined ? null : Number(evidence.knowledge.completenessScore);
  const rows: CompetitionRow[] = [{ id: String(evidence.project.id), name: String(evidence.project.name), targetType: "OWN", appearanceRate: successful ? compareMetric(targetMentions / successful * 100, "percent") : compareUnavailable("percent"), citationCount: successful ? compareMetric(targetCitations, "count") : compareUnavailable("count"), productCoverage: successful && productNames.length ? compareMetric(mentionedProducts.size / productNames.length * 100, "percent") : compareUnavailable("percent"), knowledgeCompleteness: compareMetric(knowledgeValue, "percent"), recommendationProbability: compareMetric(latestProbability ?? (ownBenchmark?.simulationScore === null || ownBenchmark?.simulationScore === undefined ? null : Number(ownBenchmark.simulationScore)), "percent") }];
  for (const benchmark of evidence.benchmark.filter((row) => String(row.targetType) === "COMPETITOR")) {
    const name = String(benchmark.name ?? "竞品");
    const appearances = evidence.results.filter((row) => strings(row.competitorBrands).some((brand) => brand.toLocaleLowerCase() === name.toLocaleLowerCase())).length;
    rows.push({ id: String(benchmark.competitorId ?? benchmark.id), name, targetType: "COMPETITOR", appearanceRate: successful ? compareMetric(appearances / successful * 100, "percent") : compareUnavailable("percent"), citationCount: compareUnavailable("count"), productCoverage: compareUnavailable("percent"), knowledgeCompleteness: compareUnavailable("percent"), recommendationProbability: compareMetric(benchmark.simulationScore === null || benchmark.simulationScore === undefined ? null : Number(benchmark.simulationScore), "percent") });
  }
  return rows;
}

function explanationInput(evidence: AISearchGrowthEvidence) {
  const entityAuthority = authorityScore(evidence.entity);
  const own = evidence.benchmark.find((row) => String(row.targetType) === "OWN" && row.overallScore !== null);
  const competitors = evidence.benchmark.filter((row) => String(row.targetType) === "COMPETITOR" && row.overallScore !== null);
  const strongest = competitors.length ? competitors.reduce((best, row) => Number(row.overallScore) > Number(best.overallScore) ? row : best) : null;
  const missingTypes = rowJsonArray(evidence.knowledge, "missingKnowledge").flatMap((item) => item && typeof item === "object" && "type" in item ? [String((item as { type: unknown }).type)] : []);
  return {
    realSearch: evidence.results.length ? { successfulCount: evidence.results.length, mentionCount: evidence.results.filter((row) => row.mentioned === true).length, citationCount: evidence.results.reduce((total, row) => total + Number(row.citationCount ?? 0), 0), sourceIds: evidence.results.map((row) => String(row.id)) } : null,
    knowledge: evidence.knowledge ? { baseId: String(evidence.knowledge.baseId), profileId: evidence.knowledge.profileId ? String(evidence.knowledge.profileId) : null, missingTypes, customerProofCount: rowJsonArray(evidence.knowledge, "customerProof").length, productCount: evidence.products.length } : null,
    entity: evidence.entity && entityAuthority !== null ? { id: String(evidence.entity.id), authorityScore: entityAuthority } : null,
    benchmark: own && strongest ? { runId: String(own.runId), ownResultId: String(own.id), strongestResultId: String(strongest.id), gap: Number(own.overallScore) - Number(strongest.overallScore) } : null,
  };
}

function roadmap(tasks: AISearchGrowthEvidence["tasks"]): RoadmapTask[] {
  return tasks.map((task) => { const issueId = String(task.issueId); const source = issueId.includes("REAL_AI_VISIBILITY_GAP") ? "真实 AI 可见性" : issueId.includes("AI_RECOMMENDATION_GAP") ? "AI 推荐诊断" : issueId.includes("KNOWLEDGE_GAP") ? "企业知识缺口" : "竞品基准差距"; const priority = String(task.severity).toUpperCase() as RoadmapTask["priority"]; return { id: String(task.id), issueId, title: String(task.title), source, priority: ["HIGH", "MEDIUM", "LOW"].includes(priority) ? priority : "MEDIUM", impact: priority === "HIGH" ? "优先影响 AI 推荐与商业曝光" : priority === "MEDIUM" ? "影响增长稳定性与覆盖" : "用于持续改善竞争力", reason: String(task.description ?? ""), recommendation: String(task.recommendation ?? ""), status: String(task.status) }; });
}

function buildResponse(evidence: AISearchGrowthEvidence): AISearchGrowthResponse {
  const providers = AI_SEARCH_PROVIDER_TYPES.map((provider) => providerSummary(provider, evidence.results));
  const ranks = evidence.results.flatMap((row) => row.rankPosition === null || row.rankPosition === undefined ? [] : [Number(row.rankPosition)]);
  const score = calculateAISearchGrowthScore(buildScoreInput(evidence));
  const trend: GrowthTrendPoint[] = [...evidence.results].reverse().map((row) => ({ id: String(row.id), provider: String(row.provider) as AISearchProviderType, mentioned: row.mentioned === true, rankPosition: row.rankPosition === null || row.rankPosition === undefined ? null : Number(row.rankPosition), citationCount: Number(row.citationCount ?? 0), completedAt: iso(row.completedAt ?? row.createdAt) }));
  const rows = comparisonRows(evidence);
  const hasCompetitorEvidence = rows.some((row) => row.targetType === "COMPETITOR" && [row.appearanceRate, row.citationCount, row.productCoverage, row.knowledgeCompleteness, row.recommendationProbability].some((item) => item.status === "available"));
  return { project: { id: String(evidence.project.id), name: String(evidence.project.name), domain: String(evidence.project.domain) }, overview: { status: evidence.results.length ? "available" : "unavailable", totalSuccessfulChecks: evidence.results.length, brandMentions: evidence.results.length ? evidence.results.filter((row) => row.mentioned === true).length : null, citations: evidence.results.length ? evidence.results.reduce((total, row) => total + Number(row.citationCount ?? 0), 0) : null, averageRank: ranks.length ? Math.round(ranks.reduce((total, rank) => total + rank, 0) / ranks.length * 10) / 10 : null, providers }, trend, competition: { status: hasCompetitorEvidence ? "available" : "unavailable", rows }, explanation: explainAIRecommendation(explanationInput(evidence)), score, roadmap: roadmap(evidence.tasks), relationship: { websiteScanAvailable: evidence.websiteScanAvailable, seoAnalysisAvailable: evidence.seoAnalysisAvailable, knowledgeProfileAvailable: Boolean(evidence.knowledge?.profileId), realAISearchAvailable: evidence.results.length > 0 } };
}

export async function loadAISearchGrowth(userId: string, projectId: string) { const evidence = await aiSearchGrowthRepository.loadEvidence(userId, projectId); if (!evidence) throw new AISearchGrowthError("PROJECT_FORBIDDEN", 403); return buildResponse(evidence); }
export async function calculateAndSaveAISearchGrowth(userId: string, projectId: string) { const response = await loadAISearchGrowth(userId, projectId); if (response.score.status === "unavailable") throw new AISearchGrowthError("AI_GROWTH_SCORE_UNAVAILABLE", 409); const saved = await aiSearchGrowthRepository.saveScore(userId, projectId, response.score); if (!saved) throw new AISearchGrowthError("PROJECT_FORBIDDEN", 403); return { ...response, score: { ...saved, sources: response.score.sources } }; }

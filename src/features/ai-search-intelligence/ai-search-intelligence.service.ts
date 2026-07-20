import { analyzeAIRecommendation } from "./ai-recommendation-analyzer";
import { aiSearchIntelligenceRepository } from "./ai-search-intelligence.repository";
import type { AISearchIntelligenceResponse, AISearchIntent, AISearchPlatform, CreateAISearchEvaluationInput } from "./types";

export class AISearchIntelligenceError extends Error { constructor(public code: string, public status: number) { super(code); } }
const providerNames: Record<AISearchPlatform, string> = { CHATGPT: "ChatGPT", GEMINI: "Gemini", CLAUDE: "Claude", PERPLEXITY: "Perplexity" };

export async function loadAISearchIntelligence(userId: string, projectId: string, requested?: { platform?: AISearchPlatform; intent?: AISearchIntent; query?: string }): Promise<AISearchIntelligenceResponse> {
  const [project, latestEvaluation] = await Promise.all([aiSearchIntelligenceRepository.projectForUser(userId, projectId), aiSearchIntelligenceRepository.latestEvaluation(userId, projectId)]);
  if (!project) throw new AISearchIntelligenceError("PROJECT_FORBIDDEN", 403);
  const platform = requested?.platform ?? latestEvaluation?.platform ?? "CHATGPT";
  const intent = requested?.intent ?? latestEvaluation?.intent ?? "RESEARCH";
  const evidence = await aiSearchIntelligenceRepository.loadEvidence(userId, projectId, providerNames[platform]);
  const analysis = analyzeAIRecommendation(evidence);
  const targetEntity = evidence.entity?.brandName || String(project.name ?? "");
  const query = requested?.query?.trim() || evidence.simulation?.query || latestEvaluation?.query || "";
  return { project: { id: String(project.id), name: String(project.name ?? ""), industry: String(project.industry ?? "") }, context: { query, platform, intent, targetEntity, knowledgeVersion: evidence.knowledge?.version ?? null }, analysis, latestEvaluation };
}

export async function createAISearchEvaluation(userId: string, input: CreateAISearchEvaluationInput) {
  const current = await loadAISearchIntelligence(userId, input.projectId, input);
  const evidence = await aiSearchIntelligenceRepository.loadEvidence(userId, input.projectId, providerNames[input.platform]);
  const saved = await aiSearchIntelligenceRepository.createEvaluation(userId, { projectId: input.projectId, simulationResultId: evidence.simulation?.id ?? null, query: input.query.trim(), platform: input.platform, industry: current.project.industry, intent: input.intent, targetEntity: current.context.targetEntity, knowledgeVersion: current.context.knowledgeVersion, evaluationStatus: current.analysis.status === "available" ? "AVAILABLE" : "UNAVAILABLE", healthScore: current.analysis.healthScore, recommendationProbability: current.analysis.recommendationProbability, confidence: current.analysis.confidence, signals: current.analysis.signals, issues: current.analysis.issues, methodVersion: current.analysis.methodVersion });
  if (!saved) throw new AISearchIntelligenceError("PROJECT_FORBIDDEN", 403);
  await aiSearchIntelligenceRepository.syncOptimizationTasks(userId, input.projectId, current.analysis.issues);
  return { ...current, latestEvaluation: saved };
}

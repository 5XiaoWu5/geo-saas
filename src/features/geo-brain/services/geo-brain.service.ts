import { analyzeAuthoritySignals, analyzeCitationPotential } from "@/features/geo-brain/analyzers/authority-analyzer";
import { analyzeContentStructure } from "@/features/geo-brain/analyzers/content-analyzer";
import { analyzeEntityAuthority } from "@/features/geo-brain/analyzers/entity-analyzer";
import { analyzeSchemaCoverage } from "@/features/geo-brain/analyzers/schema-analyzer";
import { GEO_ANALYSIS_PROMPT } from "@/features/geo-brain/prompts/geo-analysis.prompt";
import { OPTIMIZATION_PROMPT } from "@/features/geo-brain/prompts/optimization.prompt";
import { calculateGeoBrainScore, mergeAnalyzerOutputs } from "@/features/geo-brain/scoring/geo-score-engine";
import { getAIProvider, getAIProviderMetadata } from "@/features/geo-brain/providers/provider-manager";
import type { GeoBrainAnalysisResult, GeoBrainAnalyzerResult, GeoBrainInput } from "@/features/geo-brain/types";

function stripCodeFences(value: string) {
  return value.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
}

function safeParseJson(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(stripCodeFences(text)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function uniqueProblems(values: GeoBrainAnalyzerResult["problems"]) {
  const seen = new Set<string>();
  return values.filter((item) => {
    const key = `${item.type}:${item.description}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function uniqueRecommendations(values: GeoBrainAnalyzerResult["recommendations"]) {
  const seen = new Set<string>();
  return values.filter((item) => {
    const key = `${item.priority}:${item.action}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildLocalAnalysis(input: GeoBrainInput) {
  const entity = analyzeEntityAuthority(input);
  const content = analyzeContentStructure(input);
  const schema = analyzeSchemaCoverage(input);
  const authority = analyzeAuthoritySignals(input);
  const citationScore = analyzeCitationPotential(input, authority.score);
  const score = calculateGeoBrainScore({
    entityScore: entity.score,
    contentScore: content.score,
    schemaScore: schema.score,
    authorityScore: authority.score,
    citationScore,
  });

  const merged = mergeAnalyzerOutputs([entity, content, schema, authority]);
  const insights = uniqueStrings([
    ...merged.insights,
    score.entityScore >= 80 ? "Entity authority is strong enough for AI grounding." : "Entity authority still needs additional clarity.",
    score.schemaScore >= 80 ? "Structured data coverage is strong." : "Structured data coverage can be improved.",
  ]);
  const problems = uniqueProblems(merged.problems);
  const recommendations = uniqueRecommendations(merged.recommendations);

  return {
    geoScore: score.geoScore,
    score,
    insights,
    problems,
    recommendations,
    aiSummary: "Local GEO Brain analysis completed from live crawl, entity, and authority signals.",
    provider: "local-rules",
    model: "geo-brain-rules-v1",
  };
}

async function tryAiEnhancement(input: GeoBrainInput, base: ReturnType<typeof buildLocalAnalysis>) {
  const metadata = getAIProviderMetadata();
  const provider = getAIProvider();
  if (!provider) return base;

  const prompt = `${GEO_ANALYSIS_PROMPT}\n${OPTIMIZATION_PROMPT}`;
  const context = {
    url: input.url,
    project: input.project,
    crawlData: input.crawlData,
    entityData: input.entityData,
    inventoryData: input.inventoryData,
    localAnalysis: base,
  };

  try {
    const response = await provider.analyze(prompt, context);
    const parsed = safeParseJson(response.text);
    const insights = Array.isArray(parsed?.insights) ? parsed.insights.map(String).filter(Boolean) : base.insights;
    const problems = Array.isArray(parsed?.problems)
      ? parsed.problems.map((problem) => ({
          type: String((problem as Record<string, unknown>).type ?? "content") as GeoBrainAnalysisResult["problems"][number]["type"],
          severity: String((problem as Record<string, unknown>).severity ?? "medium") as GeoBrainAnalysisResult["problems"][number]["severity"],
          description: String((problem as Record<string, unknown>).description ?? ""),
        })).filter((problem) => problem.description)
      : base.problems;
    const recommendations = Array.isArray(parsed?.recommendations)
      ? parsed.recommendations.map((recommendation) => ({
          priority: String((recommendation as Record<string, unknown>).priority ?? "medium") as GeoBrainAnalysisResult["recommendations"][number]["priority"],
          action: String((recommendation as Record<string, unknown>).action ?? ""),
          rationale: String((recommendation as Record<string, unknown>).rationale ?? ""),
        })).filter((recommendation) => recommendation.action)
      : base.recommendations;

    return {
      ...base,
      insights: uniqueStrings(insights),
      problems: uniqueProblems(problems),
      recommendations: uniqueRecommendations(recommendations),
      aiSummary: typeof parsed?.aiSummary === "string" && parsed.aiSummary.trim() ? parsed.aiSummary.trim() : response.text.trim() || base.aiSummary,
      provider: response.provider || metadata.provider,
      model: response.model || metadata.model,
    };
  } catch {
    return {
      ...base,
      provider: metadata.provider,
      model: metadata.model,
    };
  }
}

export async function runGeoBrainAnalysis(input: GeoBrainInput): Promise<GeoBrainAnalysisResult> {
  const local = buildLocalAnalysis(input);
  return tryAiEnhancement(input, local);
}

import type { AISearchGrowthScoreInput, AISearchGrowthScoreView } from "./types";

export const AI_SEARCH_GROWTH_WEIGHTS = { visibility: 25, citation: 20, knowledge: 20, authority: 20, competition: 15 } as const;
const METHOD_VERSION = "ai-growth-score-v1" as const;

function clamp(value: number) { return Math.max(0, Math.min(100, Math.round(value))); }

export function calculateAISearchGrowthScore(input: AISearchGrowthScoreInput): AISearchGrowthScoreView {
  const dimensions = Object.entries(input) as Array<[keyof typeof AI_SEARCH_GROWTH_WEIGHTS, AISearchGrowthScoreInput[keyof AISearchGrowthScoreInput]]>;
  const confidence = dimensions.reduce((total, [key, metric]) => total + (metric.status === "available" && metric.value !== null ? AI_SEARCH_GROWTH_WEIGHTS[key] : 0), 0);
  const sources = {
    visibility: input.visibility.sourceIds,
    citation: input.citation.sourceIds,
    knowledge: input.knowledge.sourceIds,
    authority: input.authority.sourceIds,
    competition: input.competition.sourceIds,
  };
  if (confidence === 0) return { id: null, status: "unavailable", visibilityScore: null, citationScore: null, knowledgeScore: null, authorityScore: null, competitionScore: null, overallScore: null, confidence: 0, methodVersion: METHOD_VERSION, calculatedAt: null, sources };
  const value = (key: keyof AISearchGrowthScoreInput) => input[key].status === "available" && input[key].value !== null ? clamp(input[key].value!) : null;
  const visibilityScore = value("visibility"), citationScore = value("citation"), knowledgeScore = value("knowledge"), authorityScore = value("authority"), competitionScore = value("competition");
  const overallScore = Math.round((visibilityScore ?? 0) * 0.25 + (citationScore ?? 0) * 0.2 + (knowledgeScore ?? 0) * 0.2 + (authorityScore ?? 0) * 0.2 + (competitionScore ?? 0) * 0.15);
  return { id: null, status: "available", visibilityScore, citationScore, knowledgeScore, authorityScore, competitionScore, overallScore, confidence, methodVersion: METHOD_VERSION, calculatedAt: null, sources };
}

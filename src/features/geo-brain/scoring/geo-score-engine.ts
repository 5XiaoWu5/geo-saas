import type { GeoBrainAnalyzerResult, GeoBrainScore, GeoBrainScoreDetails } from "@/features/geo-brain/types";

export function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function calculateGeoBrainScore(details: GeoBrainScoreDetails): GeoBrainScore {
  const entityScore = clampScore(details.entityScore);
  const contentScore = clampScore(details.contentScore);
  const schemaScore = clampScore(details.schemaScore);
  const authorityScore = clampScore(details.authorityScore);
  const citationScore = clampScore(details.citationScore);

  const geoScore = clampScore(
    entityScore * 0.25 +
    contentScore * 0.2 +
    schemaScore * 0.2 +
    authorityScore * 0.2 +
    citationScore * 0.15,
  );

  return {
    geoScore,
    entityScore,
    contentScore,
    schemaScore,
    authorityScore,
    citationScore,
  };
}

export function mergeAnalyzerOutputs(outputs: GeoBrainAnalyzerResult[]) {
  return {
    insights: outputs.flatMap((output) => output.insights),
    problems: outputs.flatMap((output) => output.problems),
    recommendations: outputs.flatMap((output) => output.recommendations),
  };
}

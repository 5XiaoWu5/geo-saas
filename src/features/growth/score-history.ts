import type { GrowthMetrics } from "./types";

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function average(values: Array<number | null>) {
  const available = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return available.length ? clamp(available.reduce((total, value) => total + value, 0) / available.length) : null;
}

export type ScoreHistorySources = {
  analysis: { totalScore: number; entityScore: number; schemaScore: number } | null;
  entityCompleteness: number | null;
  brain: { authorityScore?: number; citationScore?: number } | null;
  simulation: { probability: number; entityScore: number; schemaScore: number; authorityScore: number; citationScore: number } | null;
  visibility: { averageScore: number; brandMentionRate: number; totalChecks: number };
};

export function buildGrowthMetrics(sources: ScoreHistorySources): GrowthMetrics {
  const analysisEntity = sources.analysis ? clamp((sources.analysis.entityScore / 30) * 100) : null;
  const analysisSchema = sources.analysis ? clamp((sources.analysis.schemaScore / 25) * 100) : null;
  const entityScore = sources.simulation?.entityScore ?? average([analysisEntity, sources.entityCompleteness]);
  const schemaScore = sources.simulation?.schemaScore ?? analysisSchema;
  const authorityScore = sources.simulation?.authorityScore ?? (typeof sources.brain?.authorityScore === "number" ? clamp(sources.brain.authorityScore) : null);
  const citationScore = sources.simulation?.citationScore ?? (typeof sources.brain?.citationScore === "number" ? clamp(sources.brain.citationScore) : null);
  const visibilityScore = sources.visibility.totalChecks
    ? average([sources.visibility.averageScore, sources.visibility.brandMentionRate])
    : null;
  const overallScore = sources.analysis
    ? sources.simulation
      ? clamp(sources.analysis.totalScore * 0.65 + sources.simulation.probability * 0.35)
      : clamp(sources.analysis.totalScore)
    : sources.simulation?.probability ?? null;

  return { overallScore, visibilityScore, entityScore, schemaScore, authorityScore, citationScore };
}

export function calculateEntityCompleteness(profile: Record<string, unknown> | null) {
  if (!profile) return null;
  const scalars = [profile.brandName, profile.industry, profile.region, profile.description].filter((value) => typeof value === "string" && value.trim().length > 0).length;
  const lists = [profile.services, profile.products, profile.advantages].filter((value) => Array.isArray(value) && value.length > 0).length;
  return clamp(((scalars + lists) / 7) * 100);
}


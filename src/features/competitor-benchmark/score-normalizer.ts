import type { BenchmarkMetricEvidence } from "./types";

const VISIBILITY_SAMPLE_TARGET = 20;
const VISIBILITY_MENTION_WEIGHT = 0.7;
const VISIBILITY_RANK_WEIGHT = 0.3;

function rounded(value: number) {
  return Math.round(value);
}

export function clampScore(value: number) {
  return Math.max(0, Math.min(100, rounded(value)));
}

export function unavailableMetric(sourceType: string, method: string): BenchmarkMetricEvidence {
  return { available: false, score: null, confidence: null, sourceType, sourceIds: [], sampleSize: 0, method };
}

export function normalizeAbsoluteScore(
  value: number | null | undefined,
  options: { sourceType: string; sourceIds: string[]; confidence: number; sampleSize?: number; method: string },
): BenchmarkMetricEvidence {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) {
    return unavailableMetric(options.sourceType, options.method);
  }
  return {
    available: true,
    score: clampScore(value),
    confidence: clampScore(options.confidence),
    sourceType: options.sourceType,
    sourceIds: [...options.sourceIds].sort(),
    sampleSize: Math.max(0, Math.trunc(options.sampleSize ?? options.sourceIds.length)),
    method: options.method,
  };
}

export function normalizeBoundedScore(
  value: number | null | undefined,
  maximum: number,
  options: { sourceType: string; sourceIds: string[]; confidence: number; method: string },
) {
  if (typeof value !== "number" || !Number.isFinite(value) || maximum <= 0 || value < 0 || value > maximum) {
    return unavailableMetric(options.sourceType, options.method);
  }
  return normalizeAbsoluteScore((value / maximum) * 100, options);
}

export function normalizeVisibilityEvidence(input: {
  checkCount: number;
  mentionCount: number;
  averagePosition: number | null;
  sourceIds: string[];
  sourceType?: string;
}): BenchmarkMetricEvidence {
  const checkCount = Math.max(0, Math.trunc(input.checkCount));
  if (checkCount === 0) return unavailableMetric(input.sourceType ?? "VisibilityCheck", "mention-rate-rank-v1");

  const mentionCount = Math.max(0, Math.min(checkCount, Math.trunc(input.mentionCount)));
  const mentionRate = (mentionCount / checkCount) * 100;
  const averagePosition = typeof input.averagePosition === "number" && Number.isFinite(input.averagePosition) && input.averagePosition >= 1
    ? input.averagePosition
    : null;
  const rankScore = mentionCount === 0 ? 0 : averagePosition === null ? null : Math.max(0, 100 - ((averagePosition - 1) * 10));
  const score = rankScore === null
    ? mentionRate
    : (mentionRate * VISIBILITY_MENTION_WEIGHT) + (rankScore * VISIBILITY_RANK_WEIGHT);
  const sampleConfidence = 40 + (60 * Math.min(checkCount / VISIBILITY_SAMPLE_TARGET, 1));

  return normalizeAbsoluteScore(score, {
    sourceType: input.sourceType ?? "VisibilityCheck",
    sourceIds: input.sourceIds,
    confidence: sampleConfidence,
    sampleSize: checkCount,
    method: "mention-rate-rank-v1",
  });
}

export function normalizeCitationEvidence(input: {
  checkCount: number;
  citedCheckCount: number;
  sourceIds: string[];
}): BenchmarkMetricEvidence {
  const checkCount = Math.max(0, Math.trunc(input.checkCount));
  if (checkCount === 0) return unavailableMetric("VisibilityCitation", "citation-coverage-v1");
  const citedCheckCount = Math.max(0, Math.min(checkCount, Math.trunc(input.citedCheckCount)));
  const confidence = 40 + (60 * Math.min(checkCount / VISIBILITY_SAMPLE_TARGET, 1));
  return normalizeAbsoluteScore((citedCheckCount / checkCount) * 100, {
    sourceType: "VisibilityCitation",
    sourceIds: input.sourceIds,
    confidence,
    sampleSize: checkCount,
    method: "citation-coverage-v1",
  });
}

export function preferMetric(primary: BenchmarkMetricEvidence, fallback: BenchmarkMetricEvidence) {
  return primary.available ? primary : fallback;
}

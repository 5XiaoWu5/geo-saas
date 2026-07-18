import { BENCHMARK_DIMENSIONS, type BenchmarkDimension, type BenchmarkScoreBasis, type BenchmarkTargetEvidence, type CalculatedBenchmarkResult } from "./types";

export const BENCHMARK_WEIGHTS: Record<BenchmarkDimension, number> = {
  visibility: 0.2,
  entity: 0.15,
  schema: 0.15,
  authority: 0.15,
  citation: 0.15,
  simulation: 0.2,
};

const scoreFieldByDimension = {
  visibility: "visibilityScore",
  entity: "entityScore",
  schema: "schemaScore",
  authority: "authorityScore",
  citation: "citationScore",
  simulation: "simulationScore",
} as const;

function round(value: number) {
  return Math.round(value);
}

function scoreBasisFor(target: BenchmarkTargetEvidence, methodVersion: string): BenchmarkScoreBasis {
  return {
    methodVersion,
    weights: { ...BENCHMARK_WEIGHTS },
    dimensions: Object.fromEntries(BENCHMARK_DIMENSIONS.map((dimension) => {
      const evidence = target.metrics[dimension];
      return [dimension, {
        available: evidence.available,
        confidence: evidence.confidence,
        sourceType: evidence.sourceType,
        sourceIds: [...evidence.sourceIds].sort(),
        sampleSize: evidence.sampleSize,
        method: evidence.method,
      }];
    })) as BenchmarkScoreBasis["dimensions"],
  };
}

export function calculateBenchmarkTarget(target: BenchmarkTargetEvidence, methodVersion: string): CalculatedBenchmarkResult {
  const availableDimensions = BENCHMARK_DIMENSIONS.filter((dimension) => target.metrics[dimension].available && target.metrics[dimension].score !== null);
  const availableWeight = availableDimensions.reduce((total, dimension) => total + BENCHMARK_WEIGHTS[dimension], 0);
  const weightedScore = availableDimensions.reduce((total, dimension) => total + ((target.metrics[dimension].score ?? 0) * BENCHMARK_WEIGHTS[dimension]), 0);
  const weightedConfidence = availableDimensions.reduce((total, dimension) => total + ((target.metrics[dimension].confidence ?? 0) * BENCHMARK_WEIGHTS[dimension]), 0);
  const available = availableDimensions.length > 0 && availableWeight > 0;
  const result: CalculatedBenchmarkResult = {
    benchmarkRunId: "",
    targetType: target.targetType,
    targetKey: target.targetKey,
    competitorId: target.competitorId,
    name: target.name,
    available,
    overallScore: available ? round(weightedScore / availableWeight) : null,
    visibilityScore: null,
    entityScore: null,
    schemaScore: null,
    authorityScore: null,
    citationScore: null,
    simulationScore: null,
    difference: null,
    ranking: null,
    coverage: available ? round(availableWeight * 100) : null,
    confidence: available ? round(weightedConfidence) : null,
    scoreBasis: scoreBasisFor(target, methodVersion),
    metadata: {},
  };

  for (const dimension of BENCHMARK_DIMENSIONS) {
    result[scoreFieldByDimension[dimension]] = target.metrics[dimension].available ? target.metrics[dimension].score : null;
  }
  return result;
}

import { BENCHMARK_DIMENSIONS, BENCHMARK_METRICS, type BenchmarkDimension, type BenchmarkGap, type BenchmarkGapAnalysis, type BenchmarkGapMetric, type BenchmarkMetricKey, type RankedBenchmarkResult } from "./types";

type MetricSource = Partial<Record<BenchmarkMetricKey, number | null>>;

export function buildBenchmarkGaps(own: MetricSource, competitor: MetricSource): BenchmarkGap[] {
  return BENCHMARK_METRICS.map((metric) => {
    const ownScore = typeof own[metric] === "number" ? own[metric] ?? null : null;
    const competitorScore = typeof competitor[metric] === "number" ? competitor[metric] ?? null : null;
    const available = ownScore !== null && competitorScore !== null;
    return { metric, available, ownScore, competitorScore, difference: available ? ownScore - competitorScore : null };
  });
}

const resultFieldByMetric: Record<BenchmarkGapMetric, "overallScore" | `${BenchmarkDimension}Score`> = {
  overall: "overallScore",
  visibility: "visibilityScore",
  entity: "entityScore",
  schema: "schemaScore",
  authority: "authorityScore",
  citation: "citationScore",
  simulation: "simulationScore",
};

function reasonFor(metric: BenchmarkGapMetric, actionable: boolean) {
  return actionable ? `competitor_leads_on_${metric}` : `no_actionable_${metric}_gap`;
}

export function analyzeBenchmarkGaps(
  own: RankedBenchmarkResult | null,
  competitors: RankedBenchmarkResult[],
  actionableThreshold = 5,
): BenchmarkGapAnalysis[] {
  const metrics: BenchmarkGapMetric[] = ["overall", ...BENCHMARK_DIMENSIONS];
  return metrics.map((metric) => {
    const ownScore = own?.[resultFieldByMetric[metric]] ?? null;
    const candidates = competitors
      .map((competitor) => ({ competitor, score: competitor[resultFieldByMetric[metric]] }))
      .filter((entry): entry is { competitor: RankedBenchmarkResult; score: number } => typeof entry.score === "number")
      .sort((left, right) => (
        right.score - left.score
        || left.competitor.targetKey.localeCompare(right.competitor.targetKey, "en-US")
      ));
    const leading = candidates[0] ?? null;
    const available = typeof ownScore === "number" && Boolean(leading);
    const difference = available && leading ? ownScore - leading.score : null;
    const confidence = available && own && leading
      ? Math.min(own.confidence ?? 0, leading.competitor.confidence ?? 0) / 100
      : null;
    const actionable = difference !== null && difference <= -Math.abs(actionableThreshold) && (confidence ?? 0) >= 0.5;
    return {
      metric,
      available,
      ownScore,
      competitorScore: leading?.score ?? null,
      difference,
      leadingCompetitorId: leading?.competitor.competitorId ?? null,
      leadingCompetitor: leading?.competitor.name ?? null,
      confidence,
      actionable,
      reason: available ? reasonFor(metric, actionable) : "unavailable",
    };
  });
}

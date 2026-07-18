import { BENCHMARK_METRICS, type BenchmarkGap, type BenchmarkMetricKey } from "./types";

type MetricSource = Partial<Record<BenchmarkMetricKey, number | null>>;

export function buildBenchmarkGaps(own: MetricSource, competitor: MetricSource): BenchmarkGap[] {
  return BENCHMARK_METRICS.map((metric) => {
    const ownScore = typeof own[metric] === "number" ? own[metric] ?? null : null;
    const competitorScore = typeof competitor[metric] === "number" ? competitor[metric] ?? null : null;
    const available = ownScore !== null && competitorScore !== null;
    return { metric, available, ownScore, competitorScore, difference: available ? ownScore - competitorScore : null };
  });
}

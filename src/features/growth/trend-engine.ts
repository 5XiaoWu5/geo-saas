import { GROWTH_METRICS, type GrowthMetricDelta, type GrowthMetricKey, type GrowthRange, type GrowthSnapshot, type GrowthTrend } from "./types";

const RANGE_DAYS: Record<Exclude<GrowthRange, "all">, number> = { "7d": 7, "30d": 30, "90d": 90 };

function metricValues(snapshots: GrowthSnapshot[], key: GrowthMetricKey) {
  return snapshots.map((snapshot) => snapshot[key]).filter((value): value is number => typeof value === "number");
}

function deltaFor(snapshots: GrowthSnapshot[], key: GrowthMetricKey): GrowthMetricDelta {
  const values = metricValues(snapshots, key);
  const first = values[0] ?? null;
  const latest = values.at(-1) ?? null;
  return { key, first, latest, change: values.length >= 2 && first !== null && latest !== null ? latest - first : null };
}

export function buildGrowthTrend(snapshots: GrowthSnapshot[], range: GrowthRange): GrowthTrend {
  const sorted = [...snapshots].sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
  const points = range === "all" ? sorted : sorted.filter((snapshot) => {
    const threshold = Date.now() - RANGE_DAYS[range] * 24 * 60 * 60 * 1000;
    return new Date(snapshot.createdAt).getTime() >= threshold;
  });
  return { range, points, deltas: GROWTH_METRICS.map((key) => deltaFor(points, key)) };
}

export function metricDelta(snapshots: GrowthSnapshot[], key: GrowthMetricKey) {
  return deltaFor([...snapshots].sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()), key).change;
}


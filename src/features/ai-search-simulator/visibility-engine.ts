import type { SimulationRecord } from "./types";

export function calculateSimulationTrend(records: SimulationRecord[]) {
  const previousByProvider = new Map<string, number>();
  return [...records].sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()).map((record) => {
    const previous = previousByProvider.get(record.provider);
    const current = record.result?.probability;
    if (typeof current === "number") previousByProvider.set(record.provider, current);
    return {
      ...record,
      trend: typeof current === "number" && typeof previous === "number" ? current - previous : null,
    };
  }).sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

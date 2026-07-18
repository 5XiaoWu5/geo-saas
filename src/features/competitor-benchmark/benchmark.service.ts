import { competitorRepository } from "./competitor.repository";
import { benchmarkRepository } from "./benchmark.repository";
import { CompetitorServiceError, listCompetitors } from "./competitor.service";
import { buildBenchmarkGaps } from "./gap-engine";
import { COMPETITOR_SNAPSHOT_METRICS, type BenchmarkMetricKey, type CompetitorSnapshotInput } from "./types";

type MetricSource = Partial<Record<BenchmarkMetricKey, number | null>>;

export async function loadBenchmarkFoundation(userId: string, projectId: string) {
  const [competitors, snapshots] = await Promise.all([
    listCompetitors(userId, projectId),
    competitorRepository.latestSnapshotsForProject(userId, projectId),
  ]);
  const snapshotsByCompetitor = new Map(snapshots.map((snapshot) => [snapshot.competitorId, snapshot]));
  const entries = competitors.map((competitor) => ({ competitor, snapshot: snapshotsByCompetitor.get(competitor.id) ?? null }));
  return {
    projectId,
    status: entries.some((entry) => entry.snapshot) ? "available" as const : "unavailable" as const,
    entries,
  };
}

export async function loadLatestBenchmarkData(userId: string, projectId: string, provider?: string | null) {
  const run = await benchmarkRepository.latestCompletedRunForProject(userId, projectId, provider);
  if (!run) return { status: "unavailable" as const, run: null, results: [] };
  const results = await benchmarkRepository.resultsForRun(userId, run.id);
  if (!results.length) return { status: "unavailable" as const, run, results: [] };
  return { status: "available" as const, run, results };
}

export function compareBenchmarkMetrics(own: MetricSource | null, competitor: MetricSource | null) {
  if (!own || !competitor) return { status: "unavailable" as const, gaps: [] };
  return { status: "available" as const, gaps: buildBenchmarkGaps(own, competitor) };
}

export async function requireCompetitorForProject(userId: string, projectId: string, competitorId: string) {
  const competitor = await competitorRepository.findByIdForUser(userId, competitorId);
  if (!competitor || competitor.projectId !== projectId) throw new CompetitorServiceError("COMPETITOR_FORBIDDEN", 403);
  return competitor;
}

export async function saveCompetitorSnapshot(userId: string, input: CompetitorSnapshotInput) {
  await requireCompetitorForProject(userId, input.projectId, input.competitorId);
  if (!input.methodVersion.trim() || !input.sourceId.trim()) throw new CompetitorServiceError("INVALID_SNAPSHOT_INPUT", 400);
  const scores = COMPETITOR_SNAPSHOT_METRICS.map((metric) => input[metric]).filter((score): score is number => typeof score === "number");
  if (!scores.length || scores.some((score) => !Number.isInteger(score) || score < 0 || score > 100)) throw new CompetitorServiceError("INVALID_SNAPSHOT_INPUT", 400);
  const snapshot = await competitorRepository.saveSnapshotForUser(userId, input);
  if (!snapshot) throw new CompetitorServiceError("COMPETITOR_FORBIDDEN", 403);
  return snapshot;
}

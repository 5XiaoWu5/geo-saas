import assert from "node:assert/strict";
import test from "node:test";
import { calculateBenchmarkTarget } from "./benchmark-calculator";
import { buildBenchmarkTargetEvidence, calculateAndRankBenchmark, executeBenchmarkRun } from "./benchmark-engine";
import { createOrReuseBenchmarkOptimizationTask, type BenchmarkOptimizationStore } from "./benchmark-optimization-builder";
import { analyzeBenchmarkGaps } from "./gap-engine";
import { rankBenchmarkResults } from "./ranking-engine";
import { normalizeAbsoluteScore, unavailableMetric } from "./score-normalizer";
import type { OptimizationTask } from "@/features/optimization/types";
import type { BenchmarkRun, BenchmarkTargetEvidence, CalculatedBenchmarkResult, RankedBenchmarkResult } from "./types";
import type { BenchmarkEvidenceBundle } from "./benchmark.repository";

const run: BenchmarkRun = {
  id: "run-1",
  projectId: "project-a",
  campaignId: null,
  runKey: "run-key",
  scopeHash: "scope-hash",
  provider: "ALL",
  methodVersion: "benchmark-v1",
  windowStart: null,
  windowEnd: null,
  queryCount: 2500,
  status: "PENDING",
  completedAt: null,
  createdAt: "2026-07-18T00:00:00.000Z",
  updatedAt: "2026-07-18T00:00:00.000Z",
};

function metric(score: number, confidence = 100) {
  return normalizeAbsoluteScore(score, { sourceType: "test", sourceIds: [String(score)], confidence, sampleSize: 20, method: "test-v1" });
}

function target(name: string, scores: Partial<Record<"visibility" | "entity" | "schema" | "authority" | "citation" | "simulation", number>>): BenchmarkTargetEvidence {
  return {
    targetType: name === "OWN" ? "OWN" : "COMPETITOR",
    targetKey: name === "OWN" ? "OWN" : `COMPETITOR:${name}`,
    competitorId: name === "OWN" ? null : name,
    name,
    metrics: {
      visibility: typeof scores.visibility === "number" ? metric(scores.visibility) : unavailableMetric("test", "test-v1"),
      entity: typeof scores.entity === "number" ? metric(scores.entity) : unavailableMetric("test", "test-v1"),
      schema: typeof scores.schema === "number" ? metric(scores.schema) : unavailableMetric("test", "test-v1"),
      authority: typeof scores.authority === "number" ? metric(scores.authority) : unavailableMetric("test", "test-v1"),
      citation: typeof scores.citation === "number" ? metric(scores.citation) : unavailableMetric("test", "test-v1"),
      simulation: typeof scores.simulation === "number" ? metric(scores.simulation) : unavailableMetric("test", "test-v1"),
    },
  };
}

function calculated(name: string, overallScore: number, simulationScore: number, visibilityScore: number, confidence = 90): CalculatedBenchmarkResult {
  const base = calculateBenchmarkTarget(target(name, { visibility: visibilityScore, entity: overallScore, schema: overallScore, authority: overallScore, citation: overallScore, simulation: simulationScore }), "benchmark-v1");
  return { ...base, overallScore, simulationScore, visibilityScore, confidence };
}

test("same benchmark input produces stable output", () => {
  const input = target("OWN", { visibility: 80, entity: 70, simulation: 60 });
  assert.deepEqual(calculateBenchmarkTarget(input, "benchmark-v1"), calculateBenchmarkTarget(input, "benchmark-v1"));
});

test("missing metrics remain unavailable instead of becoming zero", () => {
  const result = calculateBenchmarkTarget(target("OWN", {}), "benchmark-v1");
  assert.equal(result.available, false);
  assert.equal(result.overallScore, null);
  assert.equal(result.coverage, null);
  assert.equal(result.confidence, null);
});

test("available metrics are reweighted and coverage lowers confidence", () => {
  const result = calculateBenchmarkTarget(target("OWN", { visibility: 80, simulation: 60 }), "benchmark-v1");
  assert.equal(result.overallScore, 70);
  assert.equal(result.coverage, 40);
  assert.equal(result.confidence, 40);
});

test("ranking uses dense rank and deterministic tie ordering", () => {
  const ranked = rankBenchmarkResults([
    calculated("OWN", 80, 70, 60),
    calculated("b", 90, 80, 80),
    calculated("a", 80, 75, 70),
    calculated("c", 80, 75, 70),
  ]);
  assert.deepEqual(ranked.map((item) => [item.name, item.ranking]), [["b", 1], ["a", 2], ["c", 2], ["OWN", 3]]);
});

test("gap analysis returns the leading competitor and actionable difference", () => {
  const own = { ...calculated("OWN", 82, 80, 70, 82), citationScore: 50 } as RankedBenchmarkResult;
  const competitor = { ...calculated("competitor-a", 85, 82, 75, 90), citationScore: 73 } as RankedBenchmarkResult;
  const citation = analyzeBenchmarkGaps(own, [competitor]).find((gap) => gap.metric === "citation");
  assert.deepEqual(citation, {
    metric: "citation",
    available: true,
    ownScore: 50,
    competitorScore: 73,
    difference: -23,
    leadingCompetitorId: "competitor-a",
    leadingCompetitor: "competitor-a",
    confidence: 0.82,
    actionable: true,
    reason: "competitor_leads_on_citation",
  });
});

test("optimization builder reuses the stable issue id", async () => {
  const tasks = new Map<string, OptimizationTask>();
  let creates = 0;
  const store: BenchmarkOptimizationStore = {
    async createOrReuse(_userId, projectId, issueId) {
      const existing = tasks.get(issueId);
      if (existing) return existing;
      creates += 1;
      const task: OptimizationTask = { id: "task-1", projectId, issueId, title: "test", description: "", recommendation: "", severity: "High", category: "benchmark", status: "PENDING", createdAt: run.createdAt, updatedAt: run.updatedAt };
      tasks.set(issueId, task);
      return task;
    },
  };
  const gap = analyzeBenchmarkGaps({ ...calculated("OWN", 70, 70, 70, 90), citationScore: 50 } as RankedBenchmarkResult, [{ ...calculated("competitor-a", 80, 80, 80, 90), citationScore: 70 } as RankedBenchmarkResult]).find((item) => item.metric === "citation");
  assert.ok(gap);
  const first = await createOrReuseBenchmarkOptimizationTask("user-a", "project-a", gap, store);
  const second = await createOrReuseBenchmarkOptimizationTask("user-a", "project-a", gap, store);
  assert.equal(first.issueId, "benchmark:project-a:citation");
  assert.equal(second.task.id, first.task.id);
  assert.equal(creates, 1);
  assert.equal(tasks.size, 1);
});

test("a user without the run cannot execute another project's benchmark", async () => {
  const repository = {
    findRunForUser: async () => null,
    updateRunStatusForUser: async () => null,
    loadEvidenceForRun: async () => ({ analysis: null, competitors: [], simulations: [], visibility: [] }),
    upsertResultsForUser: async () => [],
    deleteResultsOutsideTargetsForUser: async () => 0,
  };
  await assert.rejects(() => executeBenchmarkRun("user-b", "run-a", repository), (error: unknown) => (
    error instanceof Error && "code" in error && error.code === "BENCHMARK_RUN_FORBIDDEN"
  ));
});

test("aggregated evidence handles 10 competitors and 2500 samples without expanding query rows", () => {
  const bundle: BenchmarkEvidenceBundle = {
    analysis: { id: "analysis", totalScore: 80, entityScore: 24, schemaScore: 20, createdAt: run.createdAt },
    competitors: Array.from({ length: 10 }, (_, index) => ({ competitorId: `c${index}`, name: `Competitor ${index}`, snapshotId: `s${index}`, overallScore: 70, visibilityScore: 60, entityScore: 70, schemaScore: 70, authorityScore: 70, citationScore: 70, methodVersion: "v1", createdAt: run.createdAt })),
    simulations: [],
    visibility: [
      { targetType: "OWN", competitorId: null, checkCount: 2500, mentionCount: 1000, averagePosition: 3, citedCheckCount: 800, sourceIds: ["aggregate-own"] },
      ...Array.from({ length: 10 }, (_, index) => ({ targetType: "COMPETITOR" as const, competitorId: `c${index}`, checkCount: 2500, mentionCount: 900 + index, averagePosition: 4, citedCheckCount: 700, sourceIds: [`aggregate-c${index}`] })),
    ],
  };
  const started = performance.now();
  assert.equal(buildBenchmarkTargetEvidence(bundle).length, 11);
  assert.equal(calculateAndRankBenchmark(run, bundle).length, 11);
  assert.ok(performance.now() - started < 1000);
});

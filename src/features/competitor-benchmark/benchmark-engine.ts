import { benchmarkRepository, type BenchmarkEvidenceBundle, type BenchmarkSimulationAggregateRow, type BenchmarkVisibilityAggregateRow } from "./benchmark.repository";
import { calculateBenchmarkTarget } from "./benchmark-calculator";
import { analyzeBenchmarkGaps } from "./gap-engine";
import { rankBenchmarkResults } from "./ranking-engine";
import { normalizeAbsoluteScore, normalizeBoundedScore, normalizeCitationEvidence, normalizeVisibilityEvidence, preferMetric, unavailableMetric } from "./score-normalizer";
import type { BenchmarkDimension, BenchmarkEngineOutput, BenchmarkRun, BenchmarkTargetEvidence, BenchmarkTargetType, RankedBenchmarkResult } from "./types";

export class BenchmarkEngineError extends Error {
  constructor(public code: string, public status: number) {
    super(code);
  }
}

function aggregateKey(targetType: BenchmarkTargetType, competitorId: string | null) {
  return targetType === "OWN" ? "OWN" : `COMPETITOR:${competitorId ?? ""}`;
}

function simulationMetric(aggregate: BenchmarkSimulationAggregateRow | undefined, metric: "probability" | "entityScore" | "schemaScore" | "authorityScore" | "citationScore") {
  if (!aggregate) return unavailableMetric("SimulationResult", `simulation-${metric}-v1`);
  const sampleConfidence = 40 + (60 * Math.min(aggregate.sampleCount / 20, 1));
  return normalizeAbsoluteScore(aggregate[metric], {
    sourceType: "SimulationResult",
    sourceIds: aggregate.sourceIds,
    confidence: Math.min(aggregate.confidence ?? 0, sampleConfidence),
    sampleSize: aggregate.sampleCount,
    method: `simulation-${metric}-average-v1`,
  });
}

function visibilityMetric(aggregate: BenchmarkVisibilityAggregateRow | undefined) {
  return aggregate ? normalizeVisibilityEvidence(aggregate) : unavailableMetric("VisibilityCheck", "mention-rate-rank-v1");
}

function citationMetric(aggregate: BenchmarkVisibilityAggregateRow | undefined) {
  return aggregate ? normalizeCitationEvidence(aggregate) : unavailableMetric("VisibilityCitation", "citation-coverage-v1");
}

function snapshotMetric(value: number | null, snapshotId: string | null, metric: BenchmarkDimension, methodVersion: string | null) {
  return normalizeAbsoluteScore(value, {
    sourceType: "CompetitorSnapshot",
    sourceIds: snapshotId ? [snapshotId] : [],
    confidence: 75,
    sampleSize: snapshotId ? 1 : 0,
    method: `snapshot-${metric}-${methodVersion || "unknown"}`,
  });
}

function ownEvidence(bundle: BenchmarkEvidenceBundle, simulation: BenchmarkSimulationAggregateRow | undefined, visibility: BenchmarkVisibilityAggregateRow | undefined): BenchmarkTargetEvidence {
  const analysisId = bundle.analysis?.id ? [bundle.analysis.id] : [];
  const analysisEntity = normalizeBoundedScore(bundle.analysis?.entityScore, 30, { sourceType: "GeoAnalysis", sourceIds: analysisId, confidence: 85, method: "geo-analysis-entity-v1" });
  const analysisSchema = normalizeBoundedScore(bundle.analysis?.schemaScore, 25, { sourceType: "GeoAnalysis", sourceIds: analysisId, confidence: 85, method: "geo-analysis-schema-v1" });
  return {
    targetType: "OWN",
    targetKey: "OWN",
    competitorId: null,
    name: "OWN",
    metrics: {
      visibility: visibilityMetric(visibility),
      entity: preferMetric(analysisEntity, simulationMetric(simulation, "entityScore")),
      schema: preferMetric(analysisSchema, simulationMetric(simulation, "schemaScore")),
      authority: simulationMetric(simulation, "authorityScore"),
      citation: preferMetric(citationMetric(visibility), simulationMetric(simulation, "citationScore")),
      simulation: simulationMetric(simulation, "probability"),
    },
  };
}

function competitorEvidence(
  competitor: BenchmarkEvidenceBundle["competitors"][number],
  simulation: BenchmarkSimulationAggregateRow | undefined,
  visibility: BenchmarkVisibilityAggregateRow | undefined,
): BenchmarkTargetEvidence {
  return {
    targetType: "COMPETITOR",
    targetKey: `COMPETITOR:${competitor.competitorId}`,
    competitorId: competitor.competitorId,
    name: competitor.name,
    metrics: {
      visibility: preferMetric(visibilityMetric(visibility), snapshotMetric(competitor.visibilityScore, competitor.snapshotId, "visibility", competitor.methodVersion)),
      entity: preferMetric(snapshotMetric(competitor.entityScore, competitor.snapshotId, "entity", competitor.methodVersion), simulationMetric(simulation, "entityScore")),
      schema: preferMetric(snapshotMetric(competitor.schemaScore, competitor.snapshotId, "schema", competitor.methodVersion), simulationMetric(simulation, "schemaScore")),
      authority: preferMetric(snapshotMetric(competitor.authorityScore, competitor.snapshotId, "authority", competitor.methodVersion), simulationMetric(simulation, "authorityScore")),
      citation: preferMetric(citationMetric(visibility), preferMetric(snapshotMetric(competitor.citationScore, competitor.snapshotId, "citation", competitor.methodVersion), simulationMetric(simulation, "citationScore"))),
      simulation: simulationMetric(simulation, "probability"),
    },
  };
}

export function buildBenchmarkTargetEvidence(bundle: BenchmarkEvidenceBundle) {
  const simulations = new Map(bundle.simulations.map((item) => [aggregateKey(item.targetType, item.competitorId), item]));
  const visibility = new Map(bundle.visibility.map((item) => [aggregateKey(item.targetType, item.competitorId), item]));
  return [
    ownEvidence(bundle, simulations.get("OWN"), visibility.get("OWN")),
    ...bundle.competitors.map((competitor) => competitorEvidence(
      competitor,
      simulations.get(`COMPETITOR:${competitor.competitorId}`),
      visibility.get(`COMPETITOR:${competitor.competitorId}`),
    )),
  ];
}

export function calculateAndRankBenchmark(run: BenchmarkRun, bundle: BenchmarkEvidenceBundle): RankedBenchmarkResult[] {
  const calculated = buildBenchmarkTargetEvidence(bundle).map((target) => ({
    ...calculateBenchmarkTarget(target, run.methodVersion),
    benchmarkRunId: run.id,
  }));
  const ranked = rankBenchmarkResults(calculated);
  const own = ranked.find((result) => result.targetType === "OWN") ?? null;
  return ranked.map((result) => ({
    ...result,
    difference: own?.overallScore !== null && typeof own?.overallScore === "number" && result.overallScore !== null
      ? result.overallScore - own.overallScore
      : null,
  }));
}

type BenchmarkEngineRepository = Pick<typeof benchmarkRepository, "findRunForUser" | "updateRunStatusForUser" | "loadEvidenceForRun" | "upsertResultsForUser" | "deleteResultsOutsideTargetsForUser">;

export async function executeBenchmarkRun(userId: string, benchmarkRunId: string, repository: BenchmarkEngineRepository = benchmarkRepository): Promise<BenchmarkEngineOutput> {
  const run = await repository.findRunForUser(userId, benchmarkRunId);
  if (!run) throw new BenchmarkEngineError("BENCHMARK_RUN_FORBIDDEN", 403);
  const runningRun = await repository.updateRunStatusForUser(userId, run.id, "RUNNING");
  if (!runningRun) throw new BenchmarkEngineError("BENCHMARK_RUN_FORBIDDEN", 403);
  try {
    const evidence = await repository.loadEvidenceForRun(userId, runningRun);
    const results = calculateAndRankBenchmark(runningRun, evidence);
    const availableResults = results.filter((result) => result.available);
    await repository.upsertResultsForUser(userId, run.id, availableResults.map((result) => ({
      benchmarkRunId: run.id,
      targetType: result.targetType,
      competitorId: result.competitorId,
      overallScore: result.overallScore,
      visibilityScore: result.visibilityScore,
      entityScore: result.entityScore,
      schemaScore: result.schemaScore,
      authorityScore: result.authorityScore,
      citationScore: result.citationScore,
      simulationScore: result.simulationScore,
      difference: result.difference,
      ranking: result.ranking,
      coverage: result.coverage,
      confidence: result.confidence,
      scoreBasis: JSON.stringify(result.scoreBasis),
      metadata: { name: result.name },
    })));
    await repository.deleteResultsOutsideTargetsForUser(userId, run.id, availableResults.map((result) => result.targetKey));
    const completedRun = await repository.updateRunStatusForUser(userId, run.id, "COMPLETED");
    if (!completedRun) throw new BenchmarkEngineError("BENCHMARK_RUN_FORBIDDEN", 403);
    const own = results.find((result) => result.targetType === "OWN" && result.available) ?? null;
    const competitors = results.filter((result) => result.targetType === "COMPETITOR" && result.available);
    return {
      status: availableResults.length ? "available" : "unavailable",
      run: completedRun,
      results,
      gaps: analyzeBenchmarkGaps(own, competitors),
    };
  } catch (error) {
    await repository.updateRunStatusForUser(userId, run.id, "FAILED").catch(() => null);
    throw error;
  }
}

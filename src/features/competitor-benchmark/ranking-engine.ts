import type { RankedBenchmarkResult, CalculatedBenchmarkResult } from "./types";

function descendingNullable(left: number | null | undefined, right: number | null | undefined) {
  if (left === right) return 0;
  if (left === null || typeof left === "undefined") return 1;
  if (right === null || typeof right === "undefined") return -1;
  return right - left;
}

function stableName(value: string) {
  return value.normalize("NFKC").trim().toLocaleLowerCase("en-US");
}

function compareNames(left: string, right: string) {
  const normalizedLeft = stableName(left);
  const normalizedRight = stableName(right);
  if (normalizedLeft < normalizedRight) return -1;
  if (normalizedLeft > normalizedRight) return 1;
  return 0;
}

function scoreTuple(result: CalculatedBenchmarkResult) {
  return [result.overallScore, result.simulationScore, result.visibilityScore] as const;
}

function sameScoreTuple(left: CalculatedBenchmarkResult, right: CalculatedBenchmarkResult) {
  const leftTuple = scoreTuple(left);
  const rightTuple = scoreTuple(right);
  return leftTuple.every((value, index) => value === rightTuple[index]);
}

export function rankBenchmarkResults(results: CalculatedBenchmarkResult[]): RankedBenchmarkResult[] {
  const available = results.filter((result) => result.available && result.overallScore !== null).sort((left, right) => (
    descendingNullable(left.overallScore, right.overallScore)
    || descendingNullable(left.simulationScore, right.simulationScore)
    || descendingNullable(left.visibilityScore, right.visibilityScore)
    || compareNames(left.name, right.name)
    || compareNames(left.targetKey, right.targetKey)
  ));
  let rank = 0;
  let previous: CalculatedBenchmarkResult | null = null;
  const ranked = available.map((result) => {
    if (!previous || !sameScoreTuple(previous, result)) rank += 1;
    previous = result;
    return { ...result, ranking: rank, difference: null };
  });
  const unavailable = results
    .filter((result) => !result.available || result.overallScore === null)
    .sort((left, right) => compareNames(left.name, right.name) || compareNames(left.targetKey, right.targetKey))
    .map((result) => ({ ...result, ranking: null, difference: null }));
  return [...ranked, ...unavailable];
}

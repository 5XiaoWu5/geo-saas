import { readFileSync } from "node:fs";

const paths = [
  "src/features/competitor-benchmark/benchmark.repository.ts",
  "src/features/competitor-benchmark/benchmark-optimization-builder.ts",
];
const sources = paths.map((path) => readFileSync(path, "utf8"));
const source = sources.join("\n");
const queryLines = sources.flatMap((content) => content.split(/\r?\n/).filter((line) => line.includes("competitorDatabase().query(")));

if (!queryLines.length) throw new Error("Benchmark repository has no database queries to verify.");

for (const line of queryLines) {
  if (!line.includes('"Project"') || !line.includes('"userId"')) {
    throw new Error("Every Benchmark repository query must enforce Project.userId ownership.");
  }
  for (const forbidden of ["CREATE TABLE", "ALTER TABLE", "ensureSchema"]) {
    if (line.includes(forbidden)) throw new Error(`Benchmark repository contains forbidden runtime DDL: ${forbidden}`);
  }
}

if (!source.includes('cp."projectId" = run."projectId"')) {
  throw new Error("Benchmark result writes must verify competitor and run project ownership.");
}

if (!source.includes('ON CONFLICT ("projectId", "issueId") DO NOTHING')) {
  throw new Error("Benchmark optimization writes must preserve issueId idempotency.");
}

console.log(`Verified ${queryLines.length} user-scoped Benchmark repository queries.`);

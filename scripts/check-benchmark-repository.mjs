import { readFileSync } from "node:fs";

const path = "src/features/competitor-benchmark/benchmark.repository.ts";
const source = readFileSync(path, "utf8");
const queryLines = source.split(/\r?\n/).filter((line) => line.includes("competitorDatabase().query("));

if (!queryLines.length) throw new Error("Benchmark repository has no database queries to verify.");

for (const line of queryLines) {
  if (!line.includes('"Project"') || !line.includes('"userId"')) {
    throw new Error("Every Benchmark repository query must enforce Project.userId ownership.");
  }
  for (const forbidden of ["CREATE TABLE", "ALTER TABLE", "ensureSchema"]) {
    if (line.includes(forbidden)) throw new Error(`Benchmark repository contains forbidden runtime DDL: ${forbidden}`);
  }
}

if (!source.includes('cp."projectId" = br."projectId"')) {
  throw new Error("Benchmark result writes must verify competitor and run project ownership.");
}

console.log(`Verified ${queryLines.length} user-scoped Benchmark repository queries.`);

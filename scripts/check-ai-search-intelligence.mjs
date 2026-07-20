import { readFileSync } from "node:fs";

const repository = readFileSync("src/features/ai-search-intelligence/ai-search-intelligence.repository.ts", "utf8");
const queries = [...repository.matchAll(/aiSearchDatabase\(\)\.query\(\s*(['`])([\s\S]*?)\1\s*,/g)].map((match) => match[2]);
if (!queries.length) throw new Error("AI Search Intelligence repository has no queries to verify.");
for (const query of queries) {
  if (!query.includes('"Project"') || !query.includes('"userId"')) throw new Error("Every AI Search Intelligence query must enforce Project.userId ownership.");
}
for (const forbidden of ["CREATE TABLE", "ALTER TABLE", "ensureSchema"]) {
  if (repository.includes(forbidden)) throw new Error(`Runtime repository contains forbidden DDL: ${forbidden}`);
}
if (/FROM\s+"VisibilityCheck"\s+check\b/i.test(repository)) throw new Error("Repository uses reserved SQL keyword CHECK as an alias.");
const schema = readFileSync("prisma/schema.prisma", "utf8");
for (const item of ["model SimulationEvaluationProfile {", "enum AISearchPlatform {", "enum AISearchIntent {", "enum AISearchEvaluationStatus {"]) {
  if (!schema.includes(item)) throw new Error(`Missing Prisma definition: ${item}`);
}
const provider = readFileSync("src/features/ai-search-intelligence/ai-search-provider.ts", "utf8");
if (!provider.includes("export interface AISearchProvider")) throw new Error("AISearchProvider interface is missing.");
const growthTypes = readFileSync("src/features/growth-engine/types.ts", "utf8");
if (!growthTypes.includes("AI_RECOMMENDATION_GAP")) throw new Error("AI_RECOMMENDATION_GAP is not connected to Growth Opportunity.");
console.log(`Verified ${queries.length} project-scoped AI Search Intelligence queries, migration-only schema management, provider abstraction, and optimization source wiring.`);

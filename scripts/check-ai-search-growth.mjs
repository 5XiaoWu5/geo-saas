import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const schema = read("prisma/schema.prisma");
const migration = read("prisma/migrations/20260720190000_add_ai_search_growth_score/migration.sql");
const score = read("src/features/ai-search-growth/ai-search-growth-score.service.ts");
const explanation = read("src/features/ai-search-growth/ai-recommendation-explanation.service.ts");
const repository = read("src/features/ai-search-growth/repository.ts");
const api = read("src/app/api/ai-search-growth/[projectId]/route.ts");
const page = read("src/features/ai-search-growth/ai-search-command-center.tsx");

const checks = [
  [schema.includes("model AISearchGrowthScore"), "AISearchGrowthScore model"],
  [migration.includes('CREATE TABLE "AISearchGrowthScore"'), "Prisma migration"],
  [score.includes("* 0.25") && score.includes("* 0.2") && score.includes("* 0.15"), "fixed non-renormalized weights"],
  [score.includes('status: "unavailable"') && explanation.includes('status: "unavailable"'), "strict unavailable mode"],
  [explanation.includes("sources:"), "traceable explanation sources"],
  [repository.includes('p."userId" = $2'), "project ownership gate"],
  [api.includes("getCurrentUser") && api.includes("status: 401"), "session gate"],
  [page.includes("AI Growth Roadmap") && page.includes("Growth Relationship"), "commercial command center"],
  [!repository.match(/CREATE TABLE|ALTER TABLE/), "no runtime DDL"],
];

const failed = checks.filter(([passed]) => !passed);
for (const [passed, label] of checks) console.log(`${passed ? "PASS" : "FAIL"} ${label}`);
if (failed.length) process.exit(1);

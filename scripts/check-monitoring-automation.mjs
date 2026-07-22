import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const schema = read("prisma/schema.prisma");
const migration = read("prisma/migrations/20260722100000_add_ai_search_monitoring_automation/migration.sql");
const repository = read("src/features/monitoring-automation/repository.ts");
const detection = read("src/features/monitoring-automation/change-detection.service.ts");
const execution = read("src/features/real-ai-search/ai-search-execution.service.ts");
const api = read("src/app/api/ai-search-monitoring/[projectId]/route.ts");
const page = read("src/features/monitoring-automation/monitoring-center-workspace.tsx");

const checks = [
  [schema.includes("model MonitoringSchedule") && schema.includes("model MonitoringHistory") && schema.includes("model Notification"), "monitoring models"],
  [migration.includes('CREATE TABLE "MonitoringSchedule"') && migration.includes('CREATE TABLE "MonitoringHistory"') && migration.includes('CREATE TABLE "Notification"'), "Prisma migration"],
  [detection.includes('status: "unavailable"') && detection.includes("REAL_AI_VISIBILITY_DROP") && detection.includes("CITATION_DROP") && detection.includes("RANKING_DROP"), "strict change detection"],
  [execution.includes("recordMonitoringSuccess") && execution.includes("recordMonitoringFailure"), "real provider linkage"],
  [repository.includes('p."userId" = $2') && api.includes("getCurrentUser") && api.includes("status: 401"), "session and ownership gates"],
  [repository.includes('"GrowthSnapshot"') && repository.includes('"OptimizationTask"') && repository.includes('"Notification"'), "growth, optimization and notification linkage"],
  [page.includes("unavailable") && page.includes("monitoring-center/history"), "monitoring center empty state and navigation"],
  [!repository.match(/CREATE TABLE|ALTER TABLE/), "no runtime DDL"],
];

const failed = checks.filter(([passed]) => !passed);
for (const [passed, label] of checks) console.log(`${passed ? "PASS" : "FAIL"} ${label}`);
if (failed.length) process.exit(1);

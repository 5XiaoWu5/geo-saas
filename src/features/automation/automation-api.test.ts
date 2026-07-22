import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const routes = [
  "src/app/api/projects/[projectId]/automation/route.ts",
  "src/app/api/projects/[projectId]/automation/preview/route.ts",
  "src/app/api/projects/[projectId]/automation/[runId]/route.ts",
  "src/app/api/projects/[projectId]/automation/[runId]/next/route.ts",
  "src/app/api/projects/[projectId]/automation/[runId]/steps/[stepId]/approve/route.ts",
];
test("automation APIs require a session", async () => { for (const route of routes) { const source = await readFile(route, "utf8"); assert.match(source, /getCurrentUser/); assert.match(source, /UNAUTHORIZED/); } });
test("automation service always checks project ownership", async () => { const source = await readFile("src/features/automation/service.ts", "utf8"); assert.match(source, /requireOwned/); assert.match(source, /PROJECT_FORBIDDEN/); });
test("automation runtime contains no DDL and writes results to existing business models", async () => { const source = await readFile("src/features/automation/service.ts", "utf8"); assert.doesNotMatch(source, /CREATE\s+TABLE|ALTER\s+TABLE|ensureSchema/i); assert.match(source, /generateGrowthActions/); assert.match(source, /generateGrowthAgentTasks/); assert.match(source, /generateGrowthReport/); assert.match(source, /OptimizationTask/); assert.match(source, /GrowthSnapshot/); });

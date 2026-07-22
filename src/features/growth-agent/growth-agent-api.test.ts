import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("GET/POST/PATCH API 均执行 Session 与项目权限服务", async () => {
  const collection = await readFile("src/app/api/projects/[projectId]/agent-tasks/route.ts", "utf8");
  const item = await readFile("src/app/api/projects/[projectId]/agent-tasks/[taskId]/route.ts", "utf8");
  assert.match(collection, /getCurrentUser/); assert.match(collection, /status: 401/); assert.match(collection, /listGrowthAgentTasks/); assert.match(collection, /generateGrowthAgentTasks/);
  assert.match(item, /getCurrentUser/); assert.match(item, /status: 401/); assert.match(item, /updateGrowthAgentTask/);
  const service = await readFile("src/features/growth-agent/service.ts", "utf8");
  assert.match(service, /projectOwned/); assert.match(service, /PROJECT_FORBIDDEN/);
});

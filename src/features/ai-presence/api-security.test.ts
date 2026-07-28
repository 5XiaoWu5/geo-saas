import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const routes = [
  "src/app/api/projects/[projectId]/ai-presence/route.ts",
  "src/app/api/projects/[projectId]/ai-presence/profile/route.ts",
  "src/app/api/projects/[projectId]/ai-presence/checks/route.ts",
  "src/app/api/projects/[projectId]/ai-presence/tasks/route.ts",
  "src/app/api/projects/[projectId]/ai-presence/tasks/[taskId]/route.ts",
];

test("all AI Presence routes require a session", async () => {
  for (const route of routes) {
    const source = await readFile(route, "utf8");
    assert.match(source, /getCurrentUser/);
    assert.match(source, /status:\s*401/);
  }
});

test("service distinguishes missing and cross-user projects", async () => {
  const source = await readFile("src/features/ai-presence/service.ts", "utf8");
  assert.match(source, /PROJECT_NOT_FOUND/);
  assert.match(source, /PROJECT_FORBIDDEN/);
  assert.match(source, /status:\s*number/);
});

test("checks preserve history and submission remains a user declaration", async () => {
  const repository = await readFile("src/features/ai-presence/repository.ts", "utf8");
  assert.match(repository, /INSERT INTO "AIPresenceTask"/);
  assert.doesNotMatch(repository, /UPDATE "AIPresenceTask"[\s\S]*CHECK_DISCOVERABILITY/);
  assert.match(repository, /'SUBMITTED'::"AIPresenceStatus"/);
  assert.match(repository, /'USER_DECLARED'::"AIPresenceEvidenceStatus"/);
  assert.doesNotMatch(repository, /generateMock(Content|Schemas)/);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("onboarding summary API is session-protected and read-only", async () => {
  const [route, service] = await Promise.all([
    readFile("src/app/api/projects/[projectId]/onboarding/route.ts", "utf8"),
    readFile("src/features/growth-engine/onboarding-service.ts", "utf8"),
  ]);
  assert.match(route, /getCurrentUser/);
  assert.match(route, /UNAUTHORIZED/);
  assert.match(route, /export async function GET/);
  assert.doesNotMatch(route, /export async function (POST|PATCH|PUT|DELETE)/);
  assert.doesNotMatch(service, /\b(INSERT|UPDATE|DELETE)\b/);
});

test("onboarding state is derived from saved queries and historical results", async () => {
  const service = await readFile("src/features/growth-engine/onboarding-service.ts", "utf8");
  assert.match(service, /FROM "AISearchQuery"/);
  assert.match(service, /query\."archivedAt" IS NULL/);
  assert.match(service, /FROM "AISearchResult"/);
  assert.match(service, /result\."status" = 'FAILED'/);
  assert.match(service, /deriveOnboardingState\(facts\)/);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("query normalization has one database implementation shared by migration and runtime", async () => {
  const [migration, repository] = await Promise.all([
    readFile("prisma/migrations/20260728120000_add_persisted_ai_search_queries/migration.sql", "utf8"),
    readFile("src/features/real-ai-search/query-repository.ts", "utf8"),
  ]);
  assert.match(migration, /CREATE OR REPLACE FUNCTION "normalize_ai_search_query"/);
  assert.match(migration, /lower\(regexp_replace\(btrim\(input\), '\[\[:space:\]\]\+', ' ', 'g'\)\)/);
  assert.match(migration, /SET "normalizedQuery" = "normalize_ai_search_query"\("query"\)/);
  assert.match(repository, /"normalize_ai_search_query"\(\$3\)/);
});

test("historical duplicate queries are merged safely before the unique constraint", async () => {
  const migration = await readFile(
    "prisma/migrations/20260728120000_add_persisted_ai_search_queries/migration.sql",
    "utf8",
  );
  const moveResults = migration.indexOf('UPDATE "AISearchResult"');
  const deleteDuplicates = migration.indexOf('DELETE FROM "AISearchQuery"');
  const createUnique = migration.indexOf("CREATE UNIQUE INDEX");
  assert.match(migration, /^BEGIN;/);
  assert.match(migration, /COMMIT;\s*$/);
  assert.ok(moveResults > -1);
  assert.ok(deleteDuplicates > moveResults);
  assert.ok(createUnique > deleteDuplicates);
});

test("saving uses a database conflict target and reactivates an archived query", async () => {
  const repository = await readFile("src/features/real-ai-search/query-repository.ts", "utf8");
  assert.match(repository, /ON CONFLICT \("projectId", "normalizedQuery"\)/);
  assert.match(repository, /"archivedAt" = NULL/);
  assert.match(repository, /"updatedAt" = EXCLUDED\."updatedAt"/);
});

test("saving a question does not create a result and execution always creates a new result", async () => {
  const [queryRepository, execution] = await Promise.all([
    readFile("src/features/real-ai-search/query-repository.ts", "utf8"),
    readFile("src/features/real-ai-search/ai-search-execution.service.ts", "utf8"),
  ]);
  const upsert = queryRepository.slice(
    queryRepository.indexOf("async upsert"),
    queryRepository.indexOf("async owned"),
  );
  assert.doesNotMatch(upsert, /AISearchResult/);
  assert.match(execution, /aiSearchQueryRepository\.createResult/);
  assert.doesNotMatch(execution, /createPending/);
});

test("legacy text execution shares query upsert and query id execution reuses the saved query", async () => {
  const execution = await readFile(
    "src/features/real-ai-search/ai-search-execution.service.ts",
    "utf8",
  );
  assert.match(execution, /input\.queryId[\s\S]*aiSearchQueryRepository\.owned/);
  assert.match(execution, /input\.query[\s\S]*aiSearchQueryRepository\.upsert/);
});

test("failed results retain safe attempt evidence and clear answer and mention fields", async () => {
  const repository = await readFile("src/features/real-ai-search/repository.ts", "utf8");
  const failed = repository.slice(
    repository.indexOf("async markFailed"),
    repository.indexOf("async markSucceeded"),
  );
  for (const field of [
    `"status" = \\'FAILED\\'`,
    `"rawResponse" = NULL`,
    `"mentioned" = NULL`,
    `"rankPosition" = NULL`,
    `"productMentions" = \\'[]\\'::jsonb`,
    `"competitorBrands" = \\'[]\\'::jsonb`,
    `"errorCode" = $4`,
    `"durationMs" = $5`,
    `"attemptCount" = $6`,
  ]) {
    assert.ok(failed.includes(field), `missing ${field}`);
  }
});

test("archiving a question preserves historical results", async () => {
  const repository = await readFile("src/features/real-ai-search/query-repository.ts", "utf8");
  const archive = repository.slice(
    repository.indexOf("async archive"),
    repository.indexOf("async createResult"),
  );
  assert.match(archive, /UPDATE "AISearchQuery"/);
  assert.match(archive, /"archivedAt"/);
  assert.doesNotMatch(archive, /DELETE|AISearchResult/);
});

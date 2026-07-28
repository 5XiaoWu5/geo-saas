import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

test("multi-gateway APIs require sessions and delegate project ownership checks", () => {
  const routes = [
    "src/app/api/projects/[projectId]/provider-connections/route.ts",
    "src/app/api/projects/[projectId]/provider-connections/discover/route.ts",
    "src/app/api/projects/[projectId]/provider-connections/[connectionId]/route.ts",
  ].map(file => readFileSync(join(root, file), "utf8"));
  for (const source of routes) {
    assert.match(source, /getCurrentUser/);
    assert.match(source, /status:\s*401/);
  }
  const repository = readFileSync(join(root, "src/features/real-ai-search/gateway-repository.ts"), "utf8");
  assert.match(repository, /p\."userId" = \$2/);
  assert.doesNotMatch(repository, /encryptedApiKey.*NextResponse|apiKeyAuthTag.*NextResponse/);
});

test("gateway schema supports multiple connections and multiple models without runtime DDL", () => {
  const schema = readFileSync(join(root, "prisma/schema.prisma"), "utf8");
  const migration = readFileSync(
    join(root, "prisma/migrations/20260727170000_add_multi_gateway_connections/migration.sql"),
    "utf8",
  );
  const runtime = [
    "src/features/real-ai-search/gateway-repository.ts",
    "src/features/real-ai-search/gateway-service.ts",
  ].map(file => readFileSync(join(root, file), "utf8")).join("\n");
  assert.match(schema, /model AISearchGatewayConnection/);
  assert.match(schema, /models\s+AISearchGatewayModel\[\]/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS "AISearchGatewayConnection"/);
  assert.doesNotMatch(runtime, /CREATE TABLE|ALTER TABLE|CREATE INDEX/);
});

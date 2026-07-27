import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("application startup and query adapters contain no runtime DDL", async () => {
  const source = await readFile("src/features/auth/server/prisma.ts", "utf8");
  for (const statement of ["CREATE TABLE", "ALTER TABLE", "CREATE INDEX", "DROP TABLE", "DROP COLUMN"]) {
    assert.doesNotMatch(source, new RegExp(statement, "i"));
  }
});

test("the formal bootstrap migration precedes the historical baseline and is additive", async () => {
  const migration = await readFile("prisma/migrations/20260718070000_bootstrap_runtime_schema/migration.sql", "utf8");
  assert.match(migration, /CREATE TABLE IF NOT EXISTS "Project"/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS "Session"/);
  assert.match(migration, /ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS/);
  assert.doesNotMatch(migration, /DROP TABLE|DROP COLUMN|TRUNCATE/i);
});

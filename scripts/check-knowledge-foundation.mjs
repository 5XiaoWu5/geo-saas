import { readFileSync } from "node:fs";

const repositoryPath = "src/features/knowledge/knowledge.repository.ts";
const repository = readFileSync(repositoryPath, "utf8");
const queryLines = repository.split(/\r?\n/).filter((line) => line.includes("knowledgeDatabase().query("));

if (!queryLines.length) throw new Error("Knowledge repository has no queries to verify.");
for (const line of queryLines) {
  if (!line.includes('"Project"') || !line.includes('"userId"')) throw new Error("Every Knowledge query must enforce Project.userId ownership.");
}

const runtimeFiles = [
  repository,
  readFileSync("src/features/knowledge/knowledge.service.ts", "utf8"),
  readFileSync("src/features/knowledge/database.ts", "utf8"),
];
for (const source of runtimeFiles) {
  for (const forbidden of ["CREATE TABLE", "ALTER TABLE", "ensureSchema"]) {
    if (source.includes(forbidden)) throw new Error(`Knowledge runtime contains forbidden DDL: ${forbidden}`);
  }
}

const schema = readFileSync("prisma/schema.prisma", "utf8");
for (const model of ["CompanyKnowledgeBase", "KnowledgeSource", "KnowledgeDocument", "ProductEntity", "ServiceEntity", "CustomerCase", "TechnicalDocument", "KnowledgeChunk"]) {
  if (!schema.includes(`model ${model} {`)) throw new Error(`Missing Prisma model: ${model}`);
}

const session = readFileSync("src/features/auth/server/session.ts", "utf8");
const loginSchema = readFileSync("src/features/auth/server/schemas.ts", "utf8");
if (!session.includes("REMEMBERED_SESSION_MAX_AGE_SECONDS") || !loginSchema.includes("rememberMe")) throw new Error("Remember Me session support is incomplete.");

console.log(`Verified ${queryLines.length} project-scoped Knowledge queries, migration-only schema management, and Remember Me wiring.`);

import { neon } from "@neondatabase/serverless";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

type QueryFunction = {
  query: (query: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;
};

const TARGET_DOMAIN = "example.com";
const DEFAULT_TEST_MARKER = "E2E";
const CONFIRM_PHRASE = "DELETE example.com E2E";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function assertSafeEnvironment(databaseUrl: string) {
  if (process.env.NODE_ENV === "production" || process.env.CF_PAGES === "1") {
    throw new Error("Refusing to run in a production/Cloudflare environment.");
  }

  if (process.env.ALLOW_TEST_DATA_CLEANUP !== "1") {
    throw new Error("Set ALLOW_TEST_DATA_CLEANUP=1 to enable this local cleanup script.");
  }

  const host = new URL(databaseUrl).hostname;
  const allowedHosts = (process.env.CLEANUP_ALLOWED_DB_HOSTS ?? "localhost,127.0.0.1")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  if (!allowedHosts.includes(host.toLowerCase())) {
    throw new Error(`Database host "${host}" is not allowed. Set CLEANUP_ALLOWED_DB_HOSTS explicitly if this is a non-production test database.`);
  }
}

async function main() {
  const databaseUrl = requireEnv("DATABASE_URL");
  assertSafeEnvironment(databaseUrl);

  const testMarker = process.env.CLEANUP_TEST_MARKER ?? DEFAULT_TEST_MARKER;
  const sql = neon(databaseUrl) as unknown as QueryFunction;

  const projects = await sql.query(
    `SELECT "id", "userId", "name", "domain", "description", "status"
     FROM "Project"
     WHERE lower(trim("domain")) = $1
       AND (
         "name" ILIKE $2
         OR "description" ILIKE $2
         OR "status" ILIKE $2
       )
     ORDER BY "createdAt" ASC`,
    [TARGET_DOMAIN, `%${testMarker}%`],
  );

  if (!projects.length) {
    console.log(`No cleanup candidates found for domain="${TARGET_DOMAIN}" and marker="${testMarker}".`);
    return;
  }

  const projectIds = projects.map((project) => String(project.id));
  const scans = await sql.query('SELECT "id", "projectId", "url" FROM "WebsiteScan" WHERE "projectId" = ANY($1::text[]) ORDER BY "createdAt" ASC', [projectIds]);
  const analyses = await sql.query('SELECT "id", "projectId", "scanId" FROM "GeoAnalysis" WHERE "projectId" = ANY($1::text[]) ORDER BY "createdAt" ASC', [projectIds]);

  console.log("Cleanup candidates:");
  for (const project of projects) {
    console.log(`Project: id=${project.id} userId=${project.userId} name=${project.name} domain=${project.domain} status=${project.status}`);
    for (const scan of scans.filter((item) => item.projectId === project.id)) {
      console.log(`  WebsiteScan: id=${scan.id} url=${scan.url}`);
    }
    for (const analysis of analyses.filter((item) => item.projectId === project.id)) {
      console.log(`  GeoAnalysis: id=${analysis.id} scanId=${analysis.scanId}`);
    }
  }

  console.log("");
  console.log(`This script deletes only Project rows where domain="${TARGET_DOMAIN}" and marker="${testMarker}" matches name/description/status.`);
  console.log(`Type "${CONFIRM_PHRASE}" to continue.`);

  const rl = createInterface({ input, output });
  const answer = await rl.question("> ");
  rl.close();

  if (answer !== CONFIRM_PHRASE) {
    console.log("Cleanup cancelled.");
    return;
  }

  const scanIds = scans.map((scan) => String(scan.id));
  const deletedAnalyses = scanIds.length
    ? await sql.query('DELETE FROM "GeoAnalysis" WHERE "scanId" = ANY($1::text[]) RETURNING "id"', [scanIds])
    : [];
  const deletedScans = await sql.query('DELETE FROM "WebsiteScan" WHERE "projectId" = ANY($1::text[]) RETURNING "id"', [projectIds]);
  const deletedProjects = await sql.query(
    `DELETE FROM "Project"
     WHERE "id" = ANY($1::text[])
       AND lower(trim("domain")) = $2
       AND (
         "name" ILIKE $3
         OR "description" ILIKE $3
         OR "status" ILIKE $3
       )
     RETURNING "id"`,
    [projectIds, TARGET_DOMAIN, `%${testMarker}%`],
  );

  console.log(`Deleted GeoAnalysis: ${deletedAnalyses.map((row) => row.id).join(", ") || "none"}`);
  console.log(`Deleted WebsiteScan: ${deletedScans.map((row) => row.id).join(", ") || "none"}`);
  console.log(`Deleted Project: ${deletedProjects.map((row) => row.id).join(", ") || "none"}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

import { competitorDatabase, isoDate, type DatabaseRow } from "./database";
import type { BenchmarkGapAnalysis, BenchmarkGapMetric } from "./types";
import type { OptimizationSeverity, OptimizationTask } from "@/features/optimization/types";

type OptimizationCopy = {
  title: string;
  description: string;
  recommendation: string;
  category: string;
  severity: OptimizationSeverity;
};

const optimizationCopy: Record<BenchmarkGapMetric, OptimizationCopy> = {
  overall: { title: "Close the overall competitor benchmark gap", description: "The leading competitor has a higher overall GEO benchmark score.", recommendation: "Prioritize the largest available benchmark dimension gaps and rerun the benchmark after completing the related tasks.", category: "benchmark", severity: "High" },
  visibility: { title: "Improve AI visibility against competitors", description: "Competitors appear more often or rank higher in the monitored AI answers.", recommendation: "Expand monitored query coverage and improve pages that directly answer high-intent prompts.", category: "visibility", severity: "High" },
  entity: { title: "Strengthen the brand entity profile", description: "A competitor has stronger entity completeness signals.", recommendation: "Complete brand, industry, region, services, products, and differentiator information in Entity Center.", category: "entity", severity: "High" },
  schema: { title: "Close the structured data coverage gap", description: "A competitor has stronger structured data coverage.", recommendation: "Add or improve Organization, Product, Service, FAQ, and relevant page schema with validated properties.", category: "schema", severity: "High" },
  authority: { title: "Improve authority signals", description: "A competitor has stronger authority evidence.", recommendation: "Add verifiable cases, credentials, expert authorship, and reputable third-party references.", category: "technical", severity: "Medium" },
  citation: { title: "Increase citation-ready evidence", description: "A competitor is supported by more citation evidence in the benchmark window.", recommendation: "Publish source-backed facts, case results, statistics, and stable reference pages that AI systems can cite.", category: "technical", severity: "Medium" },
  simulation: { title: "Improve AI recommendation probability", description: "A competitor has a higher AI Search Simulation probability.", recommendation: "Address the weakest entity, schema, authority, citation, and visibility signals before rerunning simulations.", category: "simulation", severity: "High" },
};

export function benchmarkIssueId(projectId: string, metric: BenchmarkGapMetric) {
  return `benchmark:${projectId}:${metric}`;
}

function toOptimizationTask(row: DatabaseRow): OptimizationTask {
  return {
    id: String(row.id),
    projectId: String(row.projectId),
    issueId: String(row.issueId),
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    recommendation: String(row.recommendation ?? ""),
    severity: ["High", "Medium", "Low"].includes(String(row.severity)) ? String(row.severity) as OptimizationSeverity : "Medium",
    category: String(row.category ?? ""),
    status: ["PENDING", "PROCESSING", "COMPLETED"].includes(String(row.status)) ? String(row.status) as OptimizationTask["status"] : "PENDING",
    createdAt: isoDate(row.createdAt),
    updatedAt: isoDate(row.updatedAt),
  };
}

export type BenchmarkOptimizationStore = {
  createOrReuse(userId: string, projectId: string, issueId: string, copy: OptimizationCopy): Promise<OptimizationTask | null>;
};

export const benchmarkOptimizationStore: BenchmarkOptimizationStore = {
  async createOrReuse(userId, projectId, issueId, copy) {
    const now = new Date();
    const row = (await competitorDatabase().query('WITH inserted AS (INSERT INTO "OptimizationTask" ("id", "projectId", "issueId", "title", "description", "recommendation", "severity", "category", "status", "createdAt", "updatedAt") SELECT $1, p."id", $3, $4, $5, $6, $7, $8, \'PENDING\', $9, $9 FROM "Project" p WHERE p."id" = $2 AND p."userId" = $10 ON CONFLICT ("projectId", "issueId") DO NOTHING RETURNING *), existing AS (SELECT task.* FROM "OptimizationTask" task INNER JOIN "Project" p ON p."id" = task."projectId" WHERE task."projectId" = $2 AND task."issueId" = $3 AND p."userId" = $10) SELECT * FROM inserted UNION ALL SELECT * FROM existing LIMIT 1', [crypto.randomUUID(), projectId, issueId, copy.title, copy.description, copy.recommendation, copy.severity, copy.category, now, userId]))[0];
    return row ? toOptimizationTask(row) : null;
  },
};

export async function createOrReuseBenchmarkOptimizationTask(
  userId: string,
  projectId: string,
  gap: BenchmarkGapAnalysis,
  store: BenchmarkOptimizationStore = benchmarkOptimizationStore,
) {
  if (!gap.available || !gap.actionable) throw new Error("BENCHMARK_GAP_NOT_ACTIONABLE");
  const issueId = benchmarkIssueId(projectId, gap.metric);
  const task = await store.createOrReuse(userId, projectId, issueId, optimizationCopy[gap.metric]);
  if (!task) throw new Error("PROJECT_FORBIDDEN");
  return { task, issueId, createdOrReused: true };
}

export async function buildBenchmarkOptimizationTasks(userId: string, projectId: string, gaps: BenchmarkGapAnalysis[], store: BenchmarkOptimizationStore = benchmarkOptimizationStore) {
  return Promise.all(gaps.filter((gap) => gap.actionable).map((gap) => createOrReuseBenchmarkOptimizationTask(userId, projectId, gap, store)));
}

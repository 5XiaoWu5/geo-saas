import { createHash } from "node:crypto";
import type { GrowthReportSnapshot } from "@/features/growth-reports/types";
import type { GrowthActionCandidate, GrowthActionCategory, GrowthActionLevel } from "./types";

type SourceRow = Record<string, unknown>;
const level = (value: unknown): GrowthActionLevel => String(value).toUpperCase().includes("HIGH") || String(value).toLowerCase() === "critical" ? "HIGH" : String(value).toUpperCase().includes("LOW") || String(value).toLowerCase() === "suggestion" ? "LOW" : "MEDIUM";
const rows = (value: unknown) => Array.isArray(value) ? value.filter((item): item is SourceRow => Boolean(item && typeof item === "object" && !Array.isArray(item))) : [];
const object = (value: unknown): SourceRow => value && typeof value === "object" && !Array.isArray(value) ? value as SourceRow : {};
const text = (...values: unknown[]) => values.map((value) => typeof value === "string" ? value.trim() : "").find(Boolean) ?? "";
const stableKey = (source: string, value: string) => `${source}:${createHash("sha256").update(value).digest("hex").slice(0, 20)}`;

function categoryFor(sourceType: string, category: unknown): GrowthActionCategory {
  if (sourceType === "KNOWLEDGE_GAP" || String(category).toLowerCase().includes("knowledge")) return "KNOWLEDGE";
  if (sourceType === "BENCHMARK_GAP" || String(category).toLowerCase().includes("compet")) return "COMPETITOR";
  if (sourceType.includes("AI") || String(category).includes("ai_")) return "AI_SEARCH";
  if (sourceType === "GEO_ANALYSIS" || String(category) === "entity") return "GEO";
  return "SEO";
}

function copyFor(sourceType: string, rawTitle: string, rawDescription: string) {
  if (sourceType === "KNOWLEDGE_GAP") return { title: rawTitle || "完善企业知识证据", description: rawDescription || "企业知识画像记录了缺失项，需要补充真实资料后再验证。" };
  if (sourceType === "BENCHMARK_GAP") return { title: rawTitle || "补充竞品差异化内容", description: rawDescription || "真实竞品基准显示存在领先差距，需要补齐差异化证据。" };
  if (sourceType === "REAL_AI_VISIBILITY_GAP") return { title: rawTitle || "提升 AI 搜索品牌可见性", description: rawDescription || "真实 AI 搜索检测成功，但没有识别到目标企业。" };
  if (sourceType === "CITATION_GAP") return { title: rawTitle || "建立行业权威内容资产", description: rawDescription || "真实 AI 搜索结果缺少可追溯引用，需要建设可被引用的内容证据。" };
  return { title: rawTitle, description: rawDescription };
}

export function buildGrowthActionCandidates(snapshot: GrowthReportSnapshot | null, currentTasks: SourceRow[] = []): GrowthActionCandidate[] {
  const candidates: GrowthActionCandidate[] = [];
  const optimization = object(snapshot?.optimizationSnapshot.data);
  const tasks = [...currentTasks, ...rows(optimization.tasks)];
  for (const task of tasks) {
    if (!task.id || String(task.status) === "COMPLETED") continue;
    const sourceType = String(task.issueId ?? "OPTIMIZATION_TASK").includes("KNOWLEDGE_GAP") ? "KNOWLEDGE_GAP" : String(task.category).includes("benchmark") ? "BENCHMARK_GAP" : String(task.category).includes("ai_") ? "AI_RECOMMENDATION_GAP" : "OPTIMIZATION_TASK";
    const title = text(task.title); const description = text(task.recommendation, task.description);
    if (!title || !description) continue;
    candidates.push({ sourceKey: `optimization:${task.id}`, sourceType, opportunityId: null, optimizationTaskId: String(task.id), title, description, category: categoryFor(sourceType, task.category), priority: level(task.severity), impact: level(task.severity) });
  }
  if (!snapshot) return [...new Map(candidates.map((candidate) => [candidate.sourceKey, candidate])).values()];
  for (const opportunity of rows(optimization.opportunities)) {
    const sourceType = text(opportunity.sourceType) || "GROWTH_OPPORTUNITY";
    const rawTitle = text(opportunity.title, object(opportunity.gap).type);
    const rawDescription = text(opportunity.description, object(opportunity.gap).reason, opportunity.recommendation);
    if (!rawTitle && !rawDescription) continue;
    const copy = copyFor(sourceType, rawTitle, rawDescription);
    const evidenceId = text(opportunity.sourceId, object(opportunity.gap).type, rawTitle);
    const key = stableKey(`opportunity:${sourceType}`, `${evidenceId}|${copy.title}|${copy.description}`);
    candidates.push({ sourceKey: key, sourceType, opportunityId: key, optimizationTaskId: null, title: copy.title, description: copy.description, category: categoryFor(sourceType, opportunity.category), priority: level(opportunity.severity ?? object(opportunity.gap).severity), impact: level(opportunity.severity ?? object(opportunity.gap).severity) });
  }
  const ai = object(snapshot.aiSearchSnapshot.data);
  const successful = rows(ai.results).filter((item) => item.status === "SUCCEEDED");
  if (successful.length && successful.every((item) => item.mentioned !== true)) {
    const sourceIds = successful.map((item) => String(item.id)).sort().join(",");
    const copy = copyFor("REAL_AI_VISIBILITY_GAP", "", "");
    candidates.push({ sourceKey: stableKey("ai-visibility", sourceIds), sourceType: "REAL_AI_VISIBILITY_GAP", opportunityId: stableKey("visibility-opportunity", sourceIds), optimizationTaskId: null, ...copy, category: "AI_SEARCH", priority: "HIGH", impact: "HIGH" });
  }
  if (successful.length && Number(ai.citationCount) === 0) {
    const sourceIds = successful.map((item) => String(item.id)).sort().join(",");
    const copy = copyFor("CITATION_GAP", "", "");
    candidates.push({ sourceKey: stableKey("citation-gap", sourceIds), sourceType: "CITATION_GAP", opportunityId: stableKey("citation-opportunity", sourceIds), optimizationTaskId: null, ...copy, category: "AI_SEARCH", priority: "MEDIUM", impact: "MEDIUM" });
  }
  return [...new Map(candidates.map((candidate) => [candidate.sourceKey, candidate])).values()];
}

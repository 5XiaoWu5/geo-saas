import type { ExecutiveSummary, GrowthReportSnapshot } from "./types";

type SummaryInput = Pick<GrowthReportSnapshot, "seoSnapshot" | "geoSnapshot" | "aiSearchSnapshot" | "knowledgeSnapshot" | "competitorSnapshot" | "optimizationSnapshot">;
function data(module: SummaryInput[keyof SummaryInput]) { return module.data ?? {}; }

export function buildExecutiveSummary(input: SummaryInput): ExecutiveSummary {
  const currentState: string[] = [];
  const priorities: string[] = [];
  if (input.seoSnapshot.status === "available") {
    const seo = data(input.seoSnapshot);
    if (typeof seo.seoScore === "number") currentState.push(`当前 SEO 评分为 ${seo.seoScore}。`);
    const issues = Array.isArray(seo.technicalIssues) ? seo.technicalIssues : [];
    if (issues.length) currentState.push(`网站存在 ${issues.length} 项可追溯的 SEO 技术或内容问题。`);
  }
  if (input.aiSearchSnapshot.status === "available") {
    const ai = data(input.aiSearchSnapshot);
    if (typeof ai.mentionedCount === "number" && typeof ai.successfulResultCount === "number") currentState.push(`真实 AI 搜索成功结果中，企业出现 ${ai.mentionedCount}/${ai.successfulResultCount} 次。`);
    if (typeof ai.citationCount === "number") currentState.push(`当前快照记录 ${ai.citationCount} 次真实 AI 引用。`);
  }
  if (input.knowledgeSnapshot.status === "available") {
    const knowledge = data(input.knowledgeSnapshot);
    if (typeof knowledge.completenessScore === "number") currentState.push(`企业知识完整度为 ${knowledge.completenessScore}。`);
    const missing = Array.isArray(knowledge.missingKnowledge) ? knowledge.missingKnowledge : [];
    if (missing.length) priorities.push(`优先补齐 ${missing.length} 项企业知识证据。`);
  }
  if (input.competitorSnapshot.status === "available") {
    const competitor = data(input.competitorSnapshot);
    if (Array.isArray(competitor.gaps) && competitor.gaps.length) priorities.push(`优先处理 ${competitor.gaps.length} 项可量化竞品差距。`);
  }
  if (input.optimizationSnapshot.status === "available") {
    const optimization = data(input.optimizationSnapshot);
    if (typeof optimization.pendingCount === "number" && optimization.pendingCount > 0) priorities.push(`按影响优先级推进 ${optimization.pendingCount} 项待处理优化任务。`);
  }
  if (!priorities.length && input.geoSnapshot.status === "available") priorities.push("持续监测实体、可见性与引用变化，并在新证据出现后生成下一版报告。");
  return currentState.length || priorities.length ? { status: "available", currentState, priorities } : { status: "unavailable", currentState: [], priorities: [] };
}

export interface FutureAIWriterProvider {
  writeExecutiveSummary(snapshot: GrowthReportSnapshot): Promise<ExecutiveSummary>;
}

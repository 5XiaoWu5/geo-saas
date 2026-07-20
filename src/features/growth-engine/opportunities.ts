import type { GeoIssue, GeoIssueCategory, GeoIssueSeverity } from "@/features/geo-analysis/types";
import { recommendForIssue } from "@/features/geo-analysis/recommendations";
import type { GrowthOpportunity, GrowthOpportunityBuildInput, GrowthOpportunityDimension, GrowthOpportunitySource, GrowthOpportunityTaskInput } from "./types";

const severityWeight: Record<GeoIssueSeverity, number> = { critical: 3, warning: 2, suggestion: 1 };

const knowledgeCopy: Record<string, { title: string; problem: string; recommendation: string }> = {
  COMPANY_INFO: { title: "补充企业基础资料", problem: "AI 缺少稳定识别企业定位与业务范围的证据。", recommendation: "补充企业介绍、所属行业、目标客户、核心业务与官方联系方式。" },
  PRODUCT_DETAIL: { title: "完善产品资料", problem: "产品能力、参数或应用场景证据不足。", recommendation: "补充产品描述、关键参数、功能特点、应用场景和目标客户。" },
  SERVICE_DETAIL: { title: "完善服务资料", problem: "服务范围与交付能力证据不足。", recommendation: "补充服务内容、适用行业、交付流程与可验证成果。" },
  CUSTOMER_CASE: { title: "补充客户案例", problem: "缺少可验证的客户结果和商业证明。", recommendation: "录入真实客户案例，说明问题、解决方案、结果和可验证指标。" },
  TECHNICAL_PROOF: { title: "补充技术证明", problem: "技术优势缺少文档、参数或实验结果支持。", recommendation: "上传技术文档、测试结果、白皮书或产品参数证明。" },
  CERTIFICATION: { title: "补充认证资料", problem: "企业资质与权威性证据不足。", recommendation: "补充认证名称、颁发机构、证书编号与有效证明。" },
  FAQ: { title: "建立企业 FAQ", problem: "高频问题缺少清晰、可引用的标准答案。", recommendation: "整理客户高频问题，并提供有证据支持的标准答案。" },
};

const benchmarkLabels: Record<string, string> = {
  overall: "综合竞争力",
  visibility: "AI 可见性",
  entity: "实体理解",
  schema: "Schema 覆盖",
  authority: "权威证据",
  citation: "引用能力",
  simulation: "AI 推荐概率",
};

const benchmarkCategory: Record<string, GeoIssueCategory> = {
  overall: "entity",
  visibility: "entity",
  entity: "entity",
  schema: "schema",
  authority: "content",
  citation: "content",
  simulation: "entity",
};

function sourceForIssue(issue: GeoIssue): { dimension: GrowthOpportunityDimension; source: GrowthOpportunitySource; label: string } {
  return issue.category === "entity"
    ? { dimension: "GEO", source: "GEO_ANALYSIS", label: "GEO 分析" }
    : { dimension: "SEO", source: "SEO_ANALYSIS", label: "SEO 分析" };
}

function impactFor(severity: GeoIssueSeverity, dimension: GrowthOpportunityDimension) {
  const level = severity === "critical" ? "高" : severity === "warning" ? "中" : "低";
  const target = dimension === "SEO" ? "搜索抓取与排名" : dimension === "GEO" ? "AI 理解与推荐" : dimension === "KNOWLEDGE" ? "企业知识完整度" : "竞争排名";
  return `${level}影响 · ${target}`;
}

function trackedTaskId(issueId: string, tasks: GrowthOpportunityBuildInput["trackedTasks"]) {
  return tasks?.find((task) => task.issueId === issueId)?.id ?? null;
}

export function opportunityIssueId(opportunity: Pick<GrowthOpportunity, "id" | "source">) {
  return `growth:${opportunity.source}:${opportunity.id}`;
}

export function toGrowthOpportunityTaskInput(opportunity: GrowthOpportunity): GrowthOpportunityTaskInput {
  return {
    id: opportunity.id,
    source: opportunity.source,
    title: opportunity.title,
    problem: opportunity.problem,
    recommendation: opportunity.recommendation,
    severity: opportunity.severity,
    issueCategory: opportunity.issueCategory,
    optimizationIssueId: opportunity.optimizationIssueId,
  };
}

export function buildGrowthOpportunities(input: GrowthOpportunityBuildInput): GrowthOpportunity[] {
  const opportunities: GrowthOpportunity[] = [];

  for (const issue of input.analysisIssues ?? []) {
    const source = sourceForIssue(issue);
    const id = `${issue.category}:${issue.title}`;
    const optimizationIssueId = `${issue.category}:${issue.title}`;
    opportunities.push({
      id,
      projectId: input.projectId,
      dimension: source.dimension,
      source: source.source,
      sourceLabel: source.label,
      title: issue.title,
      problem: issue.description,
      impact: impactFor(issue.severity, source.dimension),
      recommendation: recommendForIssue(issue),
      severity: issue.severity,
      issueCategory: issue.category,
      optimizationIssueId,
      trackedTaskId: trackedTaskId(optimizationIssueId, input.trackedTasks),
    });
  }

  for (const gap of input.knowledgeGaps ?? []) {
    const copy = knowledgeCopy[gap.type] ?? { title: "完善企业知识", problem: "企业知识证据存在缺口。", recommendation: "补充与该缺口对应的真实企业资料。" };
    const severity: GeoIssueSeverity = gap.severity === "HIGH" ? "critical" : gap.severity === "MEDIUM" ? "warning" : "suggestion";
    const id = gap.type;
    const draft = { id, source: "KNOWLEDGE_GAP" as const };
    const optimizationIssueId = opportunityIssueId(draft);
    opportunities.push({ ...draft, projectId: input.projectId, dimension: "KNOWLEDGE", sourceLabel: "知识评估", title: copy.title, problem: copy.problem, impact: impactFor(severity, "KNOWLEDGE"), recommendation: copy.recommendation, severity, issueCategory: "entity", optimizationIssueId, trackedTaskId: trackedTaskId(optimizationIssueId, input.trackedTasks) });
  }

  for (const gap of input.benchmarkGaps ?? []) {
    if (!gap.available || !gap.actionable) continue;
    const label = benchmarkLabels[gap.metric] ?? gap.metric;
    const id = gap.metric;
    const draft = { id, source: "BENCHMARK_GAP" as const };
    const optimizationIssueId = `benchmark:${input.projectId}:${id}`;
    const competitor = gap.leadingCompetitor ?? "领先竞品";
    opportunities.push({ ...draft, projectId: input.projectId, dimension: "COMPETITIVE", sourceLabel: "竞品基准", title: `缩小${label}差距`, problem: `${competitor}在${label}上领先${Math.abs(gap.difference ?? 0)}分。`, impact: impactFor("critical", "COMPETITIVE"), recommendation: `优先补齐${label}相关证据与内容，完成任务后重新运行竞品基准。`, severity: "critical", issueCategory: benchmarkCategory[gap.metric] ?? "entity", optimizationIssueId, trackedTaskId: trackedTaskId(optimizationIssueId, input.trackedTasks) });
  }

  return opportunities.sort((left, right) => severityWeight[right.severity] - severityWeight[left.severity] || left.title.localeCompare(right.title, "zh-CN"));
}

import type { GrowthActionView } from "@/features/growth-actions/types";
import type { AgentPlanStep, AgentVerificationCheck, GrowthAgentCandidate } from "./types";

type Template = { steps: Omit<AgentPlanStep, "order">[]; checks: AgentVerificationCheck[]; metrics: string[] };

const templates: Record<GrowthActionView["category"], Template> = {
  KNOWLEDGE: {
    steps: [
      { title: "核对缺失证据", instruction: "打开企业知识库，确认问题描述对应的产品、案例、技术资料或 FAQ 是否确实缺失。", target: "Knowledge Center", evidenceRequired: "现有知识条目或 unavailable 状态" },
      { title: "补充结构化资料", instruction: "录入可验证的产品优势、应用场景、目标客户和问题解决方式；只使用企业已确认资料。", target: "Knowledge Assets", evidenceRequired: "来源文件、网站或用户确认内容" },
      { title: "建立可检索表达", instruction: "为确认内容补充行业关键词、标准 FAQ 与适用的 Schema 字段。", target: "Knowledge Profile", evidenceRequired: "已确认的知识实体" },
      { title: "重新生成企业画像", instruction: "知识确认后重新运行 Company Knowledge Profile 与 Knowledge Assessment。", target: "Knowledge Intelligence", evidenceRequired: "新版本知识画像" },
    ],
    checks: [{ metric: "Knowledge Completeness", sourceType: "CompanyKnowledgeProfile", successCriteria: "缺失项减少且来源可追溯" }, { metric: "Product Clarity", sourceType: "ProductEntity", successCriteria: "产品能力、场景和目标客户均有已确认内容" }],
    metrics: ["Knowledge Score", "Product Clarity", "AI Visibility"],
  },
  SEO: {
    steps: [
      { title: "定位受影响页面", instruction: "从最新 WebsiteScan 与 SEO Analysis 中确认问题页面和证据。", target: "SEO Growth", evidenceRequired: "WebsiteScan 或 GeoAnalysis sourceId" },
      { title: "执行页面优化", instruction: "按现有 OptimizationTask 建议修改标题、内容层级、技术标签或 Schema。", target: "Website", evidenceRequired: "已发布页面或代码变更" },
      { title: "重新扫描", instruction: "重新执行 Website Scan，并比较问题是否消失。", target: "Website Audit", evidenceRequired: "新的 WebsiteScan 与 GeoAnalysis" },
    ],
    checks: [{ metric: "SEO Health", sourceType: "GeoAnalysis", successCriteria: "对应真实问题不再出现" }, { metric: "Schema Coverage", sourceType: "WebsiteScan", successCriteria: "目标 Schema 可被扫描识别" }],
    metrics: ["SEO Health", "Schema Coverage"],
  },
  GEO: {
    steps: [
      { title: "确认实体缺口", instruction: "核对 EntityProfile、企业知识画像和当前 GEO 问题的证据来源。", target: "Entity Intelligence", evidenceRequired: "EntityProfile 或 GeoAnalysis" },
      { title: "补充实体表达", instruction: "完善品牌名称、业务定位、产品能力、官方关联与结构化实体信息。", target: "Entity Center", evidenceRequired: "企业确认的实体资料" },
      { title: "重新诊断", instruction: "重新执行 GEO Analysis 与 AI Recommendation Intelligence。", target: "AI Search Growth", evidenceRequired: "新分析结果" },
    ],
    checks: [{ metric: "Entity Authority", sourceType: "EntityProfile", successCriteria: "实体关键字段完整且来源可验证" }, { metric: "GEO Issues", sourceType: "GeoAnalysis", successCriteria: "对应实体问题不再出现" }],
    metrics: ["Entity Authority", "Knowledge Score", "AI Visibility"],
  },
  AI_SEARCH: {
    steps: [
      { title: "复核真实检测", instruction: "确认成功的 Provider 检测中品牌提及、排名或 Citation 缺口。", target: "AI Search Command Center", evidenceRequired: "AISearchResult 与 AISearchCitation" },
      { title: "建设可引用内容", instruction: "围绕问题主题补充有来源的事实、案例、技术说明和清晰结论。", target: "Knowledge & Content", evidenceRequired: "可公开访问并可验证的内容" },
      { title: "重新运行检测", instruction: "使用相同问题和 Provider 重新检测，避免用不同查询制造变化。", target: "AI Search Monitoring", evidenceRequired: "新一轮真实 AISearchResult" },
    ],
    checks: [{ metric: "AI Visibility", sourceType: "AISearchResult", successCriteria: "相同查询下品牌提及或排名改善" }, { metric: "Citation Strength", sourceType: "AISearchCitation", successCriteria: "新增真实可访问引用来源" }],
    metrics: ["AI Visibility", "Citation Strength", "Recommendation Presence"],
  },
  COMPETITOR: {
    steps: [
      { title: "确认领先差距", instruction: "读取最近一次 BenchmarkResult，确认领先竞品与具体指标。", target: "Competitor Benchmark", evidenceRequired: "BenchmarkRun 与 BenchmarkResult" },
      { title: "形成差异化证据", instruction: "补充竞品未覆盖或企业更具优势的产品、案例、技术与引用内容。", target: "Knowledge & Content", evidenceRequired: "企业确认的差异化资料" },
      { title: "重新运行基准", instruction: "使用同一组竞品重新执行 Benchmark，比较真实差距。", target: "Competitor Intelligence", evidenceRequired: "新的 BenchmarkRun" },
    ],
    checks: [{ metric: "Competitive Gap", sourceType: "BenchmarkResult", successCriteria: "目标指标差距缩小" }, { metric: "Differentiation Coverage", sourceType: "CompanyKnowledgeProfile", successCriteria: "差异化优势有明确证据" }],
    metrics: ["Competitive Gap", "Differentiation Coverage"],
  },
};

export function buildGrowthAgentCandidate(input: { action: GrowthActionView; hasReportEvidence: boolean }): GrowthAgentCandidate | null {
  const { action } = input;
  if (!action.id || !action.title.trim() || !action.description.trim()) return null;
  const template = templates[action.category];
  const confidence = Math.min(90, 55 + (action.optimizationTaskId ? 15 : 0) + (input.hasReportEvidence ? 15 : 0) + (action.status === "VERIFIED" ? 5 : 0));
  return {
    actionId: action.id,
    title: `AI 执行方案：${action.title}`,
    description: `依据 ${action.sourceType} 的真实证据，将“${action.title}”拆解为可执行、可验证的增长计划。`,
    category: action.category,
    priority: action.priority,
    confidence,
    expectedImpact: { status: "directional", metrics: template.metrics.map((metric) => ({ metric, direction: "increase", estimatedDelta: null, evidenceStatus: "unavailable" })) },
    executionPlan: template.steps.map((step, index) => ({ ...step, order: index + 1 })),
    verificationPlan: template.checks,
  };
}

export function buildGrowthAgentCandidates(actions: GrowthActionView[], hasReportEvidence: boolean) {
  const candidates = actions.flatMap((action) => { const candidate = buildGrowthAgentCandidate({ action, hasReportEvidence }); return candidate ? [candidate] : []; });
  return [...new Map(candidates.map((candidate) => [candidate.actionId, candidate])).values()];
}

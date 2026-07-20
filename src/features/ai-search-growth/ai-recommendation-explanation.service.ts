import type { RecommendationExplanation, RecommendationExplanationInput, RecommendationExplanationReason } from "./types";

function source(sourceType: string, sourceId: string, label: string) { return { sourceType, sourceId, label }; }

export function explainAIRecommendation(input: RecommendationExplanationInput): RecommendationExplanation {
  const reasons: RecommendationExplanationReason[] = [];
  const searchSources = input.realSearch?.sourceIds.map((id) => source("AISearchResult", id, "真实 AI 搜索结果")) ?? [];
  if (input.realSearch?.successfulCount && input.realSearch.mentionCount === 0) reasons.push({ type: "NO_REAL_AI_VISIBILITY", severity: "HIGH", description: "真实 AI 搜索检测已成功返回，但目标企业没有被提及。", recommendation: "围绕目标查询补充可验证的产品、案例与第三方来源后重新检测。", sources: searchSources });
  if (input.realSearch?.successfulCount && input.realSearch.citationCount === 0) reasons.push({ type: "LACK_CITATION_EVIDENCE", severity: "HIGH", description: "真实 AI 回答中没有发现可追溯引用来源。", recommendation: "发布包含明确事实、数据、作者与来源链接的官网内容，并争取行业第三方引用。", sources: searchSources });

  const knowledgeSources = input.knowledge ? [source("CompanyKnowledgeBase", input.knowledge.baseId, "企业知识库"), ...(input.knowledge.profileId ? [source("CompanyKnowledgeProfile", input.knowledge.profileId, "企业 AI 知识画像")] : [])] : [];
  if (input.knowledge && (input.knowledge.customerProofCount === 0 || input.knowledge.missingTypes.includes("CUSTOMER_CASE"))) reasons.push({ type: "LACK_CUSTOMER_PROOF", severity: "HIGH", description: "企业知识画像缺少真实客户案例证明。", recommendation: "补充客户行业、问题、解决方案、结果与可验证指标，并确认进入正式知识画像。", sources: knowledgeSources });
  if (input.knowledge && (input.knowledge.productCount === 0 || input.knowledge.missingTypes.includes("PRODUCT_DETAIL"))) reasons.push({ type: "LOW_PRODUCT_CLARITY", severity: "MEDIUM", description: "产品覆盖或产品细节不足，AI 难以判断企业适合哪些需求。", recommendation: "完善产品分类、技术参数、优势、应用场景和目标客户。", sources: knowledgeSources });
  if (input.entity && input.entity.authorityScore < 70) reasons.push({ type: "LOW_ENTITY_AUTHORITY", severity: input.entity.authorityScore < 40 ? "HIGH" : "MEDIUM", description: "企业实体关键信息覆盖不足，品牌身份与能力边界不够清晰。", recommendation: "补全品牌、行业、地区、企业说明、产品、服务和可验证优势。", sources: [source("EntityProfile", input.entity.id, "最新企业实体画像")] });
  if (input.benchmark && input.benchmark.gap < 0) reasons.push({ type: "BENCHMARK_DISADVANTAGE", severity: input.benchmark.gap <= -20 ? "HIGH" : "MEDIUM", description: `最新竞品基准中，自身综合能力落后最强竞品 ${Math.abs(input.benchmark.gap)} 分。`, recommendation: "按基准差距优先补齐可见性、权威性、Citation 与推荐证据。", sources: [source("BenchmarkRun", input.benchmark.runId, "最新竞品基准"), source("BenchmarkResult", input.benchmark.ownResultId, "自身结果"), source("BenchmarkResult", input.benchmark.strongestResultId, "领先竞品结果")] });

  const hasEvidence = Boolean(input.realSearch || input.knowledge || input.entity || input.benchmark);
  return hasEvidence ? { status: "available", reasons, unavailableReason: null } : { status: "unavailable", reasons: [], unavailableReason: "当前没有真实 AI 搜索、企业知识、实体或竞品基准证据。" };
}

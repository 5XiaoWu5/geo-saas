import type { MetricHelpContent } from "./metric-help";

export const METRIC_HELP_KEYS = [
  "AI_VISIBILITY",
  "ENTITY_AUTHORITY",
  "KNOWLEDGE_COMPLETENESS",
  "CITATION_STRENGTH",
  "CITATION_RATE",
  "RECOMMENDATION_RANK",
  "COMPETITION_GAP",
  "GROWTH_OPPORTUNITY",
] as const;

export type MetricHelpKey = (typeof METRIC_HELP_KEYS)[number];

export function metricHelpPreset(key: MetricHelpKey, locale: "zh" | "en"): { label: string; content: MetricHelpContent } {
  return locale === "zh" ? zh[key] : en[key];
}

const zh: Record<MetricHelpKey, { label: string; content: MetricHelpContent }> = {
  AI_VISIBILITY: item("AI 搜索可见度", "衡量品牌在真实 AI 回答中出现、被推荐和被引用的情况。", "用于判断目标客户能否通过 AI 搜索发现企业。", "AISearchResult 与 AISearchCitation。", "完善实体、权威内容和可引用证据后重新检测。"),
  ENTITY_AUTHORITY: item("实体权威度", "衡量系统能否确认企业身份、品牌关系和可信属性。", "实体信息不明确会降低 AI 采用企业资料的信心。", "EntityProfile。", "补充一致的企业名称、官网、行业、产品与证明材料。"),
  KNOWLEDGE_COMPLETENESS: item("知识完整度", "衡量企业资料中产品、服务、案例、技术与 FAQ 的证据覆盖。", "完整知识有助于 AI 理解企业能解决什么问题。", "CompanyKnowledgeProfile 与企业知识库。", "优先补充评估中明确缺失的真实资料。"),
  CITATION_STRENGTH: item("引用强度", "衡量真实 AI 回答引用企业官网或第三方来源的情况。", "可核对引用能增强回答可信度和推荐稳定性。", "AISearchCitation。", "建设可引用的产品页、案例、研究与第三方权威内容。"),
  CITATION_RATE: item("引用率", "成功 AI 检测中出现可核对来源链接的比例。", "反映企业信息能否被 AI 回答作为证据使用。", "AISearchResult 与 AISearchCitation 的真实关联。", "补充结构清晰且具备证据来源的内容。"),
  RECOMMENDATION_RANK: item("推荐排名", "企业在真实 AI 回答推荐列表中的出现位置。", "位置越靠前，用户越可能看到并考虑该企业。", "AISearchResult.rankPosition。", "缩小知识、引用和竞品差距后重新运行相同问题。"),
  COMPETITION_GAP: item("竞品差距", "企业与已配置竞品在知识、引用和推荐表现上的可验证差异。", "帮助把有限资源投入影响最大的落后项。", "BenchmarkResult、AISearchResult 与 CompanyKnowledgeProfile。", "按高优先级差距创建增长行动并验证结果。"),
  GROWTH_OPPORTUNITY: item("增长机会", "由真实 SEO、GEO、知识或竞品证据识别的待改进问题。", "它连接诊断、行动和优化任务，避免问题停留在报告中。", "GrowthOpportunity 生成规则及其来源记录。", "创建行动并按优先级推进到完成和验证。"),
};

const en: Record<MetricHelpKey, { label: string; content: MetricHelpContent }> = {
  AI_VISIBILITY: item("AI Search Visibility", "Measures brand mentions, recommendations, and citations in real AI answers.", "Shows whether target customers can discover the business through AI search.", "AISearchResult and AISearchCitation.", "Improve entities, authoritative content, and citable evidence, then rerun checks."),
  ENTITY_AUTHORITY: item("Entity Authority", "Measures whether the system can verify the company, brand relationships, and trusted attributes.", "Unclear entity information reduces confidence in using company evidence.", "EntityProfile.", "Add consistent company, website, industry, product, and proof information."),
  KNOWLEDGE_COMPLETENESS: item("Knowledge Completeness", "Measures evidence coverage across products, services, cases, technical material, and FAQs.", "Complete knowledge helps AI understand what the business can solve.", "CompanyKnowledgeProfile and the company knowledge base.", "Add the real evidence explicitly identified as missing."),
  CITATION_STRENGTH: item("Citation Strength", "Measures citations to the official site or third-party sources in real AI answers.", "Verifiable citations improve answer trust and recommendation stability.", "AISearchCitation.", "Create citable product pages, cases, research, and third-party authority."),
  CITATION_RATE: item("Citation Rate", "The share of successful AI checks that contain verifiable source links.", "Shows whether AI answers can use company information as evidence.", "Real AISearchResult and AISearchCitation relationships.", "Add clearly structured content backed by traceable sources."),
  RECOMMENDATION_RANK: item("Recommendation Rank", "The business position in a real AI answer's recommendation list.", "Higher positions are more likely to be seen and considered.", "AISearchResult.rankPosition.", "Close knowledge, citation, and competitor gaps, then rerun the same query."),
  COMPETITION_GAP: item("Competition Gap", "A verifiable difference in knowledge, citations, or recommendation performance versus configured competitors.", "Focuses resources on the highest-impact weakness.", "BenchmarkResult, AISearchResult, and CompanyKnowledgeProfile.", "Create a growth action for the highest-priority gap and verify the result."),
  GROWTH_OPPORTUNITY: item("Growth Opportunity", "An improvement issue identified from real SEO, GEO, knowledge, or competitor evidence.", "Connects diagnosis to actions and optimization work.", "GrowthOpportunity rules and their source records.", "Create an action and move it through completion and verification."),
};

function item(label: string, what: string, why: string, source: string, improve: string) {
  return { label, content: { what, why, source, improve } };
}

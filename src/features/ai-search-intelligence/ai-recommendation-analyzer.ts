import type { AIRecommendationAnalysis, AIRecommendationEvidence, AIRecommendationIssue, AIRecommendationSignal, AIRecommendationSignalType, AIRecommendationSource } from "./types";

const METHOD_VERSION = "ai-recommendation-rules-v1" as const;
const weights: Record<AIRecommendationSignalType, number> = { ENTITY_TRUST: 20, KNOWLEDGE_COMPLETENESS: 20, PRODUCT_CLARITY: 15, CUSTOMER_PROOF: 15, TECHNICAL_AUTHORITY: 10, CITATION_POTENTIAL: 10, COMPETITIVE_GAP: 10 };
const labels: Record<AIRecommendationSignalType, string> = { ENTITY_TRUST: "Entity Authority", KNOWLEDGE_COMPLETENESS: "Knowledge Completeness", PRODUCT_CLARITY: "Product Clarity", CUSTOMER_PROOF: "Customer Proof", TECHNICAL_AUTHORITY: "Technical Authority", CITATION_POTENTIAL: "Citation Strength", COMPETITIVE_GAP: "Competitor Gap" };

function clamp(value: number) { return Math.max(0, Math.min(100, Math.round(value))); }
function populated(value: unknown) { return Array.isArray(value) ? value.length > 0 : value && typeof value === "object" ? Object.keys(value as object).length > 0 : String(value ?? "").trim().length > 0; }
function available(type: AIRecommendationSignalType, score: number, explanation: string, sources: AIRecommendationSource[]): AIRecommendationSignal { return { type, label: labels[type], status: "available", score: clamp(score), explanation, evidenceCount: sources.length, sources }; }
function unavailable(type: AIRecommendationSignalType, explanation: string): AIRecommendationSignal { return { type, label: labels[type], status: "unavailable", score: null, explanation, evidenceCount: 0, sources: [] }; }
function source(sourceType: AIRecommendationSource["sourceType"], sourceId: string, label: string): AIRecommendationSource { return { sourceType, sourceId, label }; }
function fieldScore(values: unknown[]) { return clamp((values.filter(populated).length / values.length) * 100); }

export function analyzeAIRecommendation(evidence: AIRecommendationEvidence): AIRecommendationAnalysis {
  const signals: AIRecommendationSignal[] = [];
  const entity = evidence.entity;
  signals.push(entity ? available("ENTITY_TRUST", fieldScore([entity.brandName, entity.industry, entity.region, entity.description, entity.services, entity.products, entity.advantages]), "基于已保存企业实体字段的明确覆盖率。", [source("EntityProfile", entity.id, entity.brandName || "企业实体")]) : unavailable("ENTITY_TRUST", "尚无 EntityProfile，无法评估企业实体可信度。"));

  const knowledge = evidence.knowledge;
  const knowledgeSources = knowledge ? [source("CompanyKnowledgeBase", knowledge.baseId, `知识库 v${knowledge.version}`), ...(knowledge.profileId ? [source("CompanyKnowledgeProfile" as const, knowledge.profileId, "企业 AI 知识画像")] : [])] : [];
  signals.push(knowledge && knowledge.completenessScore !== null ? available("KNOWLEDGE_COMPLETENESS", knowledge.completenessScore, "使用知识库中持久化的完整度评分。", knowledgeSources) : unavailable("KNOWLEDGE_COMPLETENESS", "没有可用的知识完整度评分。"));

  if (evidence.products.length) {
    const score = Math.round(evidence.products.reduce((total, product) => total + fieldScore([product.name, product.category, product.description, product.features, product.applications, product.targetCustomers]), 0) / evidence.products.length);
    signals.push(available("PRODUCT_CLARITY", score, "按正式产品的分类、描述、功能、应用和目标客户覆盖率计算。", evidence.products.map((product) => source("ProductEntity", product.id, product.name))));
  } else if (knowledge?.missingTypes.includes("PRODUCT_DETAIL")) signals.push(available("PRODUCT_CLARITY", 0, "知识画像明确记录产品资料缺口。", knowledgeSources));
  else signals.push(unavailable("PRODUCT_CLARITY", "没有正式产品证据或产品缺口记录。"));

  if (evidence.cases.length) {
    const score = Math.round(evidence.cases.reduce((total, item) => total + fieldScore([item.customerName, item.industry, item.problem, item.solution, item.result, item.metrics]), 0) / evidence.cases.length);
    signals.push(available("CUSTOMER_PROOF", score, "按正式客户案例的问题、方案、结果和指标覆盖率计算。", evidence.cases.map((item) => source("CustomerCase", item.id, item.customerName))));
  } else if (knowledge?.missingTypes.includes("CUSTOMER_CASE")) signals.push(available("CUSTOMER_PROOF", 0, "知识画像明确记录客户案例缺口。", knowledgeSources));
  else signals.push(unavailable("CUSTOMER_PROOF", "没有正式客户案例证据或案例缺口记录。"));

  if (evidence.technicalDocuments.length || (knowledge?.certifications ?? 0) > 0) {
    const documentScore = evidence.technicalDocuments.length ? Math.round(evidence.technicalDocuments.reduce((total, item) => total + fieldScore([item.title, item.type, item.summary, item.technicalFields]), 0) / evidence.technicalDocuments.length) : 0;
    const certificationBoost = Math.min(20, (knowledge?.certifications ?? 0) * 10);
    signals.push(available("TECHNICAL_AUTHORITY", clamp(documentScore + certificationBoost), "基于正式技术文档字段和明确认证证据计算。", [...evidence.technicalDocuments.map((item) => source("TechnicalDocument", item.id, item.title)), ...knowledgeSources]));
  } else if (knowledge?.missingTypes.some((type) => type === "TECHNICAL_PROOF" || type === "CERTIFICATION")) signals.push(available("TECHNICAL_AUTHORITY", 0, "知识画像明确记录技术证明或认证缺口。", knowledgeSources));
  else signals.push(unavailable("TECHNICAL_AUTHORITY", "没有技术文档、认证或对应缺口记录。"));

  if (evidence.visibility.checks.length) {
    const averageScore = evidence.visibility.checks.reduce((total, check) => total + check.score, 0) / evidence.visibility.checks.length;
    const citationRate = evidence.visibility.checks.filter((check) => check.cited).length / evidence.visibility.checks.length * 100;
    const visibilitySources = evidence.visibility.checks.flatMap((check) => [source("VisibilityCheck", check.id, "AI 可见性检查"), ...check.citationIds.map((id) => source("VisibilityCitation" as const, id, "可追溯引用"))]);
    signals.push(available("CITATION_POTENTIAL", averageScore * 0.5 + citationRate * 0.5, "结合真实可见性检查得分与引用覆盖率计算。", visibilitySources.slice(0, 30)));
  } else signals.push(unavailable("CITATION_POTENTIAL", "尚无 AI Visibility Check，无法评估引用强度。"));

  const benchmark = evidence.benchmark;
  if (benchmark?.own && benchmark.competitors.length) {
    const strongest = Math.max(...benchmark.competitors.map((item) => item.overallScore));
    const score = clamp(50 + (benchmark.own.overallScore - strongest) / 2);
    signals.push(available("COMPETITIVE_GAP", score, `自身综合分 ${benchmark.own.overallScore}，最高竞品 ${strongest}。`, [source("BenchmarkRun", benchmark.runId, "最新竞品基准"), source("BenchmarkResult", benchmark.own.id, "自身基准结果"), ...benchmark.competitors.map((item) => source("BenchmarkResult", item.id, "竞品基准结果"))]));
  } else signals.push(unavailable("COMPETITIVE_GAP", "没有同时包含自身与竞品的 Benchmark 结果。"));

  const availableSignals = signals.filter((item) => item.status === "available" && item.score !== null);
  if (!availableSignals.length) return { status: "unavailable", healthScore: null, confidence: null, recommendationProbability: evidence.simulation?.probability ?? null, signals, issues: [], unavailableReason: "当前项目没有足够的 Entity、Knowledge、Visibility 或 Benchmark 证据。", methodVersion: METHOD_VERSION };
  const healthScore = clamp(availableSignals.reduce((total, item) => total + (item.score ?? 0) * weights[item.type] / 100, 0));
  const confidence = availableSignals.reduce((total, item) => total + weights[item.type], 0);
  const issues = signals.flatMap(issueForSignal);
  return { status: "available", healthScore, confidence, recommendationProbability: evidence.simulation?.probability ?? null, signals, issues, unavailableReason: null, methodVersion: METHOD_VERSION };
}

function issueForSignal(signal: AIRecommendationSignal): AIRecommendationIssue[] {
  if (signal.status !== "available" || signal.score === null || signal.score >= 70) return [];
  const copy = {
    ENTITY_TRUST: ["LOW_ENTITY_AUTHORITY", "企业实体信息不足，AI 难以确认品牌身份与可信度。", "补充品牌名称、行业、地区、业务描述、产品服务与可验证优势。", "entity"],
    KNOWLEDGE_COMPLETENESS: ["INCOMPLETE_KNOWLEDGE", "企业知识证据不完整，AI 无法形成稳定的企业能力画像。", "优先补齐知识评估中的高影响缺口并重新生成企业画像。", "entity"],
    PRODUCT_CLARITY: ["LOW_PRODUCT_CLARITY", "产品定位、参数、优势或应用场景证据不足。", "完善正式产品的分类、技术参数、核心优势、应用场景和目标客户。", "content"],
    CUSTOMER_PROOF: ["INSUFFICIENT_PROOF", "缺少完整客户案例与可验证结果，AI 难以判断企业交付能力。", "增加真实客户案例，写明问题、方案、结果和可验证指标。", "content"],
    TECHNICAL_AUTHORITY: ["LOW_TECHNICAL_AUTHORITY", "技术文档、行业认证或权威证明不足。", "补充技术白皮书、测试结果、认证编号和颁发机构证据。", "content"],
    CITATION_POTENTIAL: ["LOW_CITATION_POTENTIAL", "现有 AI 可见性检查中的引用与来源覆盖不足。", "发布可验证事实、数据和来源，并持续运行 AI Visibility Check。", "content"],
    COMPETITIVE_GAP: ["COMPETITIVE_DISADVANTAGE", "竞品在 AI 搜索综合证据上领先。", "根据 Benchmark 差距优先补齐实体、权威、引用和推荐证据。", "entity"],
  }[signal.type] as [AIRecommendationIssue["type"], string, string, AIRecommendationIssue["issueCategory"]];
  const severity = signal.score < 40 ? "HIGH" : signal.score < 60 ? "MEDIUM" : "LOW";
  return [{ type: copy[0], severity, reason: copy[1], recommendation: copy[2], signalType: signal.type, sources: signal.sources, optimizationIssueId: `growth:AI_RECOMMENDATION_GAP:${copy[0]}`, opportunitySource: "AI_RECOMMENDATION_GAP", issueCategory: copy[3], optimizationSeverity: severity === "HIGH" ? "critical" : severity === "MEDIUM" ? "warning" : "suggestion" }];
}

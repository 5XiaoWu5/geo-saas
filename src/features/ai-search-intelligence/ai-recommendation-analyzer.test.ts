import assert from "node:assert/strict";
import test from "node:test";
import { analyzeAIRecommendation } from "./ai-recommendation-analyzer";
import type { AIRecommendationEvidence } from "./types";

const empty: AIRecommendationEvidence = { entity: null, knowledge: null, products: [], cases: [], technicalDocuments: [], visibility: { checks: [] }, benchmark: null, simulation: null };

test("无可追溯证据时返回 unavailable 且不生成问题", () => {
  const result = analyzeAIRecommendation(empty);
  assert.equal(result.status, "unavailable");
  assert.equal(result.healthScore, null);
  assert.deepEqual(result.issues, []);
});

test("所有 Signal 都携带真实 source 引用", () => {
  const result = analyzeAIRecommendation({ ...empty, entity: { id: "entity-1", brandName: "GeoPilot", industry: "SaaS", region: "China", description: "AI Search Growth", services: ["诊断"], products: ["平台"], advantages: ["证据"] } });
  assert.equal(result.status, "available");
  const entity = result.signals.find((item) => item.type === "ENTITY_TRUST");
  assert.equal(entity?.score, 100);
  assert.deepEqual(entity?.sources.map((item) => item.sourceId), ["entity-1"]);
});

test("知识画像中的明确缺口生成 AI_RECOMMENDATION_GAP", () => {
  const result = analyzeAIRecommendation({ ...empty, knowledge: { baseId: "kb-1", profileId: "profile-1", version: 3, completenessScore: 30, missingTypes: ["PRODUCT_DETAIL", "CUSTOMER_CASE"], certifications: 0, faqTopics: 0 } });
  assert.equal(result.status, "available");
  assert.ok(result.issues.some((issue) => issue.type === "LOW_PRODUCT_CLARITY" && issue.opportunitySource === "AI_RECOMMENDATION_GAP"));
  assert.ok(result.issues.some((issue) => issue.type === "INSUFFICIENT_PROOF"));
  assert.ok(result.issues.every((issue) => issue.sources.length > 0));
});

test("推荐准备度不对缺失 Signal 重新归一化", () => {
  const result = analyzeAIRecommendation({ ...empty, entity: { id: "entity-1", brandName: "GeoPilot", industry: "SaaS", region: "China", description: "完整", services: ["服务"], products: ["产品"], advantages: ["优势"] } });
  assert.equal(result.healthScore, 20);
  assert.equal(result.confidence, 20);
});

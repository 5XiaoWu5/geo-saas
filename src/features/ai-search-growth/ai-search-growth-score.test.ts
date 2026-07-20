import test from "node:test";
import assert from "node:assert/strict";
import { calculateAISearchGrowthScore } from "./ai-search-growth-score.service";

const unavailable = { status: "unavailable" as const, value: null, sourceIds: [] };
test("固定权重不对缺失数据重新归一化", () => {
  const score = calculateAISearchGrowthScore({ visibility: { status: "available", value: 100, sourceIds: ["result-1"] }, citation: unavailable, knowledge: unavailable, authority: unavailable, competition: unavailable });
  assert.equal(score.overallScore, 25);
  assert.equal(score.confidence, 25);
});

test("完全没有证据时返回 unavailable", () => {
  const score = calculateAISearchGrowthScore({ visibility: unavailable, citation: unavailable, knowledge: unavailable, authority: unavailable, competition: unavailable });
  assert.equal(score.status, "unavailable");
  assert.equal(score.overallScore, null);
});

import test from "node:test";
import assert from "node:assert/strict";
import { explainAIRecommendation } from "./ai-recommendation-explanation.service";

test("没有证据时解释不可用", () => {
  assert.equal(explainAIRecommendation({ realSearch: null, knowledge: null, entity: null, benchmark: null }).status, "unavailable");
});

test("每条原因都携带可追溯来源", () => {
  const explanation = explainAIRecommendation({ realSearch: { successfulCount: 1, mentionCount: 0, citationCount: 0, sourceIds: ["result-1"] }, knowledge: null, entity: null, benchmark: null });
  assert.ok(explanation.reasons.length >= 2);
  assert.ok(explanation.reasons.every((reason) => reason.sources.length > 0));
});

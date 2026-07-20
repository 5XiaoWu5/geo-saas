import assert from "node:assert/strict";
import test from "node:test";
import { parseAISearchResponse } from "./response-parser";

test("解析品牌排名、产品、竞品和引用来源", () => {
  const result = parseAISearchResponse({ requestId: "r1", text: "1. GeoPilot AI - Growth Engine\n2. Rival One\n来源 https://geopilot.ai/case 与 https://media.example/report", citations: ["https://media.example/report"], raw: {} }, { targetEntity: "GeoPilot AI", officialDomain: "geopilot.ai", productNames: ["Growth Engine"], competitorNames: ["Rival One"] });
  assert.equal(result.mentioned, true); assert.equal(result.rankPosition, 1); assert.deepEqual(result.productMentions, ["Growth Engine"]); assert.deepEqual(result.competitorBrands, ["Rival One"]); assert.equal(result.citations.find((item) => item.domain === "geopilot.ai")?.citationType, "OFFICIAL"); assert.equal(result.citations.find((item) => item.domain === "media.example")?.citationCount, 2);
});

test("无品牌证据时不伪造出现或排名", () => {
  const result = parseAISearchResponse({ requestId: null, text: "没有目标企业信息", citations: [], raw: {} }, { targetEntity: "GeoPilot AI", officialDomain: "geopilot.ai", productNames: [], competitorNames: [] });
  assert.equal(result.mentioned, false); assert.equal(result.rankPosition, null); assert.deepEqual(result.citations, []);
});

import assert from "node:assert/strict";
import test from "node:test";
import { buildGrowthOpportunities, toGrowthOpportunityTaskInput } from "./opportunities";

test("统一聚合 SEO、GEO、知识与竞品增长机会", () => {
  const opportunities = buildGrowthOpportunities({
    projectId: "project-1",
    analysisIssues: [
      { category: "technical", severity: "critical", title: "缺少标题", description: "页面标题缺失" },
      { category: "entity", severity: "warning", title: "实体证据不足", description: "AI 无法确认企业实体" },
    ],
    knowledgeGaps: [{ type: "CUSTOMER_CASE", severity: "HIGH", reason: "没有客户案例" }],
    benchmarkGaps: [
      { metric: "citation", available: true, actionable: true, difference: -18, leadingCompetitor: "竞品甲" },
      { metric: "schema", available: false, actionable: false, difference: null, leadingCompetitor: null },
    ],
  });

  assert.deepEqual(opportunities.map((item) => item.dimension).sort(), ["COMPETITIVE", "GEO", "KNOWLEDGE", "SEO"]);
  assert.equal(opportunities.some((item) => item.title.includes("Schema")), false);
  assert.equal(opportunities.find((item) => item.dimension === "KNOWLEDGE")?.optimizationIssueId, "growth:KNOWLEDGE_GAP:CUSTOMER_CASE");
  assert.equal(opportunities.find((item) => item.dimension === "COMPETITIVE")?.optimizationIssueId, "benchmark:project-1:citation");
});

test("增长机会可复用现有 OptimizationTask 输入", () => {
  const [opportunity] = buildGrowthOpportunities({
    projectId: "project-1",
    knowledgeGaps: [{ type: "FAQ", severity: "MEDIUM", reason: "缺少 FAQ" }],
  });

  const input = toGrowthOpportunityTaskInput(opportunity);
  assert.equal(input.source, "KNOWLEDGE_GAP");
  assert.equal(input.optimizationIssueId, "growth:KNOWLEDGE_GAP:FAQ");
  assert.equal(input.severity, "warning");
});

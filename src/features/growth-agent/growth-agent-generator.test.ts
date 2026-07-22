import assert from "node:assert/strict";
import test from "node:test";
import { buildGrowthAgentCandidate, buildGrowthAgentCandidates } from "./growth-agent-generator";
import type { GrowthActionView } from "@/features/growth-actions/types";

const action: GrowthActionView = { id: "a1", projectId: "p1", opportunityId: "o1", optimizationTaskId: "opt1", sourceKey: "knowledge:a1", sourceType: "KNOWLEDGE_GAP", title: "补充产品知识", description: "缺少产品优势与应用场景证据", category: "KNOWLEDGE", priority: "HIGH", status: "TODO", impact: "HIGH", createdBy: "u1", completedAt: null, verifiedAt: null, createdAt: "2026-07-22T00:00:00.000Z" };

test("根据真实 Action 生成结构化执行与验证计划", () => { const result = buildGrowthAgentCandidate({ action, hasReportEvidence: true }); assert.ok(result); assert.equal(result.category, "KNOWLEDGE"); assert.ok(result.executionPlan.length >= 3); assert.ok(result.verificationPlan.some((item) => item.sourceType === "CompanyKnowledgeProfile")); assert.equal(result.confidence, 85); });
test("预计收益不编造数值", () => { const result = buildGrowthAgentCandidate({ action, hasReportEvidence: false }); assert.ok(result); assert.ok(result.expectedImpact.metrics.every((item) => item.estimatedDelta === null && item.evidenceStatus === "unavailable")); });
test("无标题或说明证据时返回 unavailable", () => { const result = buildGrowthAgentCandidate({ action: { ...action, title: "", description: "" }, hasReportEvidence: true }); assert.equal(result, null); });
test("相同 Action 不生成重复 Agent 候选", () => assert.equal(buildGrowthAgentCandidates([action, action], true).length, 1));

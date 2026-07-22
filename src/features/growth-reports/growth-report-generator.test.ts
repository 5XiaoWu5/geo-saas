import assert from "node:assert/strict";
import test from "node:test";
import { buildGrowthReportSnapshot, validateGrowthReportSnapshot } from "./growth-report-generator";
import { HtmlGrowthReportExporter } from "./html-report-exporter";
import type { GrowthReportEvidence } from "./types";

function emptyEvidence(): GrowthReportEvidence {
  return { project: { id: "project-1", name: "空数据企业", domain: "example.com" }, scan: null, analysis: null, entity: null, visibilityChecks: [], visibilityCitations: [], aiResults: [], aiCitations: [], growthScore: null, knowledge: null, knowledgeAssets: null, benchmarkRun: null, benchmarkResults: [], optimizationTasks: [], insight: null, growthSnapshots: [] };
}

test("空数据项目成功生成报告，所有业务模块均为 unavailable 且不生成虚假评分", () => {
  const snapshot = buildGrowthReportSnapshot({ evidence: emptyEvidence(), reportId: "report-1", version: 1, generatedBy: "user-1", generatedAt: "2026-07-22T08:00:00.000Z" });
  validateGrowthReportSnapshot(snapshot);
  assert.equal(snapshot.reportMeta.confidence, 0);
  assert.equal(snapshot.reportMeta.executiveSummary.status, "unavailable");
  for (const key of ["seoSnapshot", "geoSnapshot", "aiSearchSnapshot", "knowledgeSnapshot", "competitorSnapshot", "optimizationSnapshot", "insightSnapshot", "roadmapSnapshot"] as const) {
    assert.equal(snapshot[key].status, "unavailable");
    assert.equal(snapshot[key].data, undefined);
  }
});

test("v1 快照不受后续业务数据变更影响，v2 保存新的完整值", () => {
  const evidence = emptyEvidence();
  evidence.analysis = { id: "analysis-1", totalScore: 46, technicalScore: 42, contentScore: 50, schemaScore: 45, entityScore: 48, issues: [] };
  evidence.scan = { id: "scan-1", status: "COMPLETED", schemaCount: 0 };
  const v1 = buildGrowthReportSnapshot({ evidence, reportId: "report-1", version: 1, generatedBy: "user-1", generatedAt: "2026-07-22T08:00:00.000Z" });
  const originalV1 = JSON.stringify(v1);
  evidence.analysis.totalScore = 82;
  evidence.scan.schemaCount = 6;
  const v2 = buildGrowthReportSnapshot({ evidence, reportId: "report-2", version: 2, generatedBy: "user-1", generatedAt: "2026-07-22T09:00:00.000Z" });
  assert.equal(JSON.stringify(v1), originalV1);
  assert.equal((v1.seoSnapshot.data as { seoScore: number }).seoScore, 46);
  assert.equal((v2.seoSnapshot.data as { seoScore: number }).seoScore, 82);
  assert.notEqual(v1.reportMeta.dataVersion, v2.reportMeta.dataVersion);
});

test("HTML Preview 只消费快照并转义企业文本", async () => {
  const evidence = emptyEvidence(); evidence.project.name = "<script>alert(1)</script>";
  const snapshot = buildGrowthReportSnapshot({ evidence, reportId: "report-1", version: 1, generatedBy: "user-1", generatedAt: "2026-07-22T08:00:00.000Z" });
  const html = await new HtmlGrowthReportExporter().export(snapshot);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
});

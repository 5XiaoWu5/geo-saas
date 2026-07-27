import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("primary write surfaces use shared feedback and duplicate-submit guards", async () => {
  const files = [
    "src/features/real-ai-search/real-ai-search-monitoring-workspace.tsx",
    "src/features/projects/project-management.tsx",
    "src/features/competitor-benchmark/components/CompetitorCreateForm.tsx",
    "src/features/competitor-benchmark/components/CompetitorManager.tsx",
    "src/features/monitoring-automation/monitoring-center-workspace.tsx",
    "src/features/optimization/optimization-workspace.tsx",
    "src/features/geo-analysis/analyzer-workspace.tsx",
    "src/features/visibility/visibility-workspace.tsx",
    "src/features/entity/entity-workspace.tsx",
    "src/features/knowledge/components/knowledge-intelligence-workspace.tsx",
    "src/features/ai-search-intelligence/ai-search-intelligence-workspace.tsx",
    "src/features/query-generator/query-generator-workspace.tsx",
  ];
  for (const file of files) {
    const source = await readFile(file, "utf8");
    assert.match(source, /OperationFeedback/, `${file} must expose shared operation feedback`);
    assert.match(source, /disabled=|if \([^)]*(busy|saving|submitting|loading)/, `${file} must prevent duplicate writes`);
  }
});

test("destructive provider, project, competitor, and scan actions use dialogs", async () => {
  const files = [
    "src/features/real-ai-search/real-ai-search-monitoring-workspace.tsx",
    "src/features/projects/project-management.tsx",
    "src/features/competitor-benchmark/components/CompetitorManager.tsx",
    "src/features/crawl/crawl-workspace.tsx",
  ];
  for (const file of files) {
    const source = await readFile(file, "utf8");
    assert.match(source, /<Dialog/, `${file} must use an accessible confirmation dialog`);
    assert.doesNotMatch(source, /window\.confirm/, `${file} must not use browser confirm`);
  }
});

test("client write flows do not simulate completion with timers or random values", async () => {
  const files = [
    "src/features/automation/automation-console.tsx",
    "src/features/real-ai-search/real-ai-search-monitoring-workspace.tsx",
    "src/features/growth-actions/growth-action-center.tsx",
    "src/features/growth-agent/growth-agent-center.tsx",
    "src/features/growth-reports/growth-report-list.tsx",
    "src/features/monitoring-automation/monitoring-center-workspace.tsx",
  ];
  for (const file of files) {
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(source, /setTimeout\(/);
    assert.doesNotMatch(source, /Math\.random\(/);
  }
});

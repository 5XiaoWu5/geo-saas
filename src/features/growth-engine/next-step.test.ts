import assert from "node:assert/strict";
import test from "node:test";
import { selectGrowthNextStep } from "./next-step";

const complete = {
  configuredProviderCount: 1,
  testedProviderCount: 1,
  monitoringQueryCount: 1,
  aiSearchResultCount: 1,
  unresolvedIssueCount: 0,
  actionCount: 1,
  openActionCount: 0,
};

test("next-step guidance follows real state in priority order", () => {
  assert.equal(selectGrowthNextStep({ ...complete, configuredProviderCount: 0 }), "CONNECT_PROVIDER");
  assert.equal(selectGrowthNextStep({ ...complete, testedProviderCount: 0 }), "TEST_PROVIDER");
  assert.equal(selectGrowthNextStep({ ...complete, monitoringQueryCount: 0 }), "ADD_MONITORING_QUERY");
  assert.equal(selectGrowthNextStep({ ...complete, aiSearchResultCount: 0 }), "RUN_FIRST_CHECK");
  assert.equal(selectGrowthNextStep({ ...complete, unresolvedIssueCount: 2, actionCount: 0 }), "CREATE_ACTION");
  assert.equal(selectGrowthNextStep({ ...complete, openActionCount: 1 }), "START_ACTION");
  assert.equal(selectGrowthNextStep(complete), "VIEW_REPORT");
});

import assert from "node:assert/strict";
import test from "node:test";
import { deriveOnboardingState, type OnboardingFacts } from "./onboarding";

const empty: OnboardingFacts = {
  configuredProviderCount: 0,
  readyProviderCount: 0,
  providerAttentionCount: 0,
  queryCount: 0,
  resultCount: 0,
  runningResultCount: 0,
  succeededResultCount: 0,
  failedResultCount: 0,
  mentionedResultCount: 0,
  recommendationCount: 0,
  openRecommendationCount: 0,
  actionCount: 0,
  openActionCount: 0,
  completedActionCount: 0,
  reportCount: 0,
};

test("onboarding is derived only from real business facts", () => {
  const initial = deriveOnboardingState(empty);
  assert.equal(initial.nextAction, "CONNECT_PROVIDER");
  assert.deepEqual(initial.steps.map(step => step.status), [
    "COMPLETED",
    "NOT_STARTED",
    "NOT_STARTED",
    "NOT_STARTED",
    "NOT_STARTED",
  ]);

  const saved = deriveOnboardingState({
    ...empty,
    configuredProviderCount: 1,
    readyProviderCount: 1,
    queryCount: 1,
  });
  assert.equal(saved.nextAction, "RUN_CHECK");
  assert.equal(saved.steps[2]?.status, "COMPLETED");
  assert.equal(saved.steps[3]?.status, "NOT_STARTED");
});

test("a failed result is a real attempted check and needs attention", () => {
  const state = deriveOnboardingState({
    ...empty,
    configuredProviderCount: 1,
    readyProviderCount: 1,
    queryCount: 1,
    resultCount: 1,
    failedResultCount: 1,
  });
  assert.equal(state.steps[3]?.status, "NEEDS_ATTENTION");
  assert.equal(state.nextAction, "RETRY_CHECK");
});

test("successful checks and persisted work advance the real workflow", () => {
  const state = deriveOnboardingState({
    ...empty,
    configuredProviderCount: 1,
    readyProviderCount: 1,
    queryCount: 2,
    resultCount: 3,
    succeededResultCount: 2,
    failedResultCount: 1,
    recommendationCount: 2,
    actionCount: 1,
    openActionCount: 1,
  });
  assert.equal(state.steps[3]?.status, "COMPLETED");
  assert.equal(state.steps[4]?.status, "COMPLETED");
  assert.equal(state.nextAction, "START_ACTION");
  assert.equal(state.complete, true);
});

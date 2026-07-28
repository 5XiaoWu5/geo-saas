export type OnboardingStepStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "NEEDS_ATTENTION";

export type OnboardingFacts = {
  configuredProviderCount: number;
  readyProviderCount: number;
  providerAttentionCount: number;
  queryCount: number;
  resultCount: number;
  runningResultCount: number;
  succeededResultCount: number;
  failedResultCount: number;
  mentionedResultCount: number;
  recommendationCount: number;
  openRecommendationCount: number;
  actionCount: number;
  openActionCount: number;
  completedActionCount: number;
  reportCount: number;
};

export type OnboardingStepKey =
  | "CREATE_PROJECT"
  | "CONNECT_PROVIDER"
  | "ADD_QUERY"
  | "RUN_CHECK"
  | "REVIEW_RECOMMENDATIONS";

export type OnboardingStep = {
  key: OnboardingStepKey;
  status: OnboardingStepStatus;
};

export type OnboardingNextAction =
  | "CONNECT_PROVIDER"
  | "FIX_PROVIDER"
  | "ADD_QUERY"
  | "RUN_CHECK"
  | "RETRY_CHECK"
  | "REVIEW_RESULTS"
  | "CREATE_ACTION"
  | "START_ACTION"
  | "VIEW_REPORT";

export function deriveOnboardingState(facts: OnboardingFacts) {
  const providerStatus: OnboardingStepStatus =
    facts.readyProviderCount > 0
      ? "COMPLETED"
      : facts.providerAttentionCount > 0
        ? "NEEDS_ATTENTION"
        : facts.configuredProviderCount > 0
          ? "IN_PROGRESS"
          : "NOT_STARTED";
  const queryStatus: OnboardingStepStatus =
    facts.queryCount > 0 ? "COMPLETED" : "NOT_STARTED";
  const checkStatus: OnboardingStepStatus =
    facts.succeededResultCount > 0
      ? "COMPLETED"
      : facts.runningResultCount > 0
        ? "IN_PROGRESS"
        : facts.failedResultCount > 0
          ? "NEEDS_ATTENTION"
          : "NOT_STARTED";
  const recommendationStatus: OnboardingStepStatus =
    facts.succeededResultCount === 0
      ? "NOT_STARTED"
      : facts.recommendationCount > 0 || facts.actionCount > 0
        ? "COMPLETED"
        : "IN_PROGRESS";

  const steps: OnboardingStep[] = [
    { key: "CREATE_PROJECT", status: "COMPLETED" },
    { key: "CONNECT_PROVIDER", status: providerStatus },
    { key: "ADD_QUERY", status: queryStatus },
    { key: "RUN_CHECK", status: checkStatus },
    { key: "REVIEW_RECOMMENDATIONS", status: recommendationStatus },
  ];

  let nextAction: OnboardingNextAction;
  if (facts.readyProviderCount === 0) {
    nextAction = facts.providerAttentionCount > 0 ? "FIX_PROVIDER" : "CONNECT_PROVIDER";
  } else if (facts.queryCount === 0) {
    nextAction = "ADD_QUERY";
  } else if (facts.succeededResultCount === 0) {
    nextAction = facts.failedResultCount > 0 ? "RETRY_CHECK" : "RUN_CHECK";
  } else if (facts.recommendationCount === 0 && facts.actionCount === 0) {
    nextAction = "REVIEW_RESULTS";
  } else if (facts.actionCount === 0) {
    nextAction = "CREATE_ACTION";
  } else if (facts.openActionCount > 0) {
    nextAction = "START_ACTION";
  } else {
    nextAction = "VIEW_REPORT";
  }

  return {
    steps,
    nextAction,
    complete: steps.every(step => step.status === "COMPLETED"),
  };
}

export type ProjectOnboardingSummary = ReturnType<typeof deriveOnboardingState> & {
  project: { id: string; name: string };
  facts: OnboardingFacts;
  recentCompletions: Array<{
    id: string;
    type: "PROVIDER" | "AI_SEARCH" | "ACTION" | "AUTOMATION" | "REPORT";
    title: string;
    completedAt: string;
    sourceType: string;
  }>;
};

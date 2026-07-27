export type GrowthNextStepKey =
  | "CONNECT_PROVIDER"
  | "TEST_PROVIDER"
  | "ADD_MONITORING_QUERY"
  | "RUN_FIRST_CHECK"
  | "CREATE_ACTION"
  | "START_ACTION"
  | "VIEW_REPORT";

export type GrowthNextStepState = {
  configuredProviderCount: number;
  testedProviderCount: number;
  monitoringQueryCount: number;
  aiSearchResultCount: number;
  unresolvedIssueCount: number;
  actionCount: number;
  openActionCount: number;
};

export function selectGrowthNextStep(state: GrowthNextStepState): GrowthNextStepKey {
  if (state.configuredProviderCount === 0) return "CONNECT_PROVIDER";
  if (state.testedProviderCount === 0) return "TEST_PROVIDER";
  if (state.monitoringQueryCount === 0) return "ADD_MONITORING_QUERY";
  if (state.aiSearchResultCount === 0) return "RUN_FIRST_CHECK";
  if (state.unresolvedIssueCount > 0 && state.actionCount === 0) return "CREATE_ACTION";
  if (state.openActionCount > 0) return "START_ACTION";
  return "VIEW_REPORT";
}

export function growthNextStepLabel(key: GrowthNextStepKey, locale: "zh" | "en") {
  const labels: Record<GrowthNextStepKey, [string, string]> = {
    CONNECT_PROVIDER: ["连接一个 AI 平台", "Connect an AI platform"],
    TEST_PROVIDER: ["测试 Provider 连接", "Test the provider connection"],
    ADD_MONITORING_QUERY: ["添加需要监控的品牌问题", "Add a brand query to monitor"],
    RUN_FIRST_CHECK: ["运行第一次 AI 搜索检测", "Run the first AI search check"],
    CREATE_ACTION: ["创建增长行动", "Create a growth action"],
    START_ACTION: ["开始执行优先级最高的行动", "Start the highest-priority action"],
    VIEW_REPORT: ["查看本周期增长报告", "Review this period's growth report"],
  };
  return labels[key][locale === "zh" ? 0 : 1];
}

import type { MonitoringSnapshot } from "@/features/monitoring/types";

export const monitoringSnapshot: MonitoringSnapshot = {
  geoHistory: [
    { id: "geo_01", projectId: "acme-cloud", recordedAt: "2026-06-10", geoScore: 61, entityScore: 58, contentScore: 64, trustScore: 55, technicalScore: 70 },
    { id: "geo_02", projectId: "acme-cloud", recordedAt: "2026-06-17", geoScore: 64, entityScore: 61, contentScore: 66, trustScore: 58, technicalScore: 72 },
    { id: "geo_03", projectId: "acme-cloud", recordedAt: "2026-06-24", geoScore: 68, entityScore: 66, contentScore: 69, trustScore: 62, technicalScore: 75 },
    { id: "geo_04", projectId: "acme-cloud", recordedAt: "2026-07-01", geoScore: 72, entityScore: 73, contentScore: 72, trustScore: 66, technicalScore: 78 },
    { id: "geo_05", projectId: "acme-cloud", recordedAt: "2026-07-08", geoScore: 78, entityScore: 82, contentScore: 76, trustScore: 68, technicalScore: 81 },
  ],
  visibilityHistory: [
    { id: "vis_01", projectId: "acme-cloud", recordedAt: "2026-06-10", prompt: "推荐广州展示柜厂家", platform: "ChatGPT", mentioned: false, rankingPosition: null },
    { id: "vis_02", projectId: "acme-cloud", recordedAt: "2026-06-17", prompt: "推荐广州展示柜厂家", platform: "ChatGPT", mentioned: true, rankingPosition: 5 },
    { id: "vis_03", projectId: "acme-cloud", recordedAt: "2026-06-24", prompt: "推荐广州展示柜厂家", platform: "Gemini", mentioned: false, rankingPosition: null },
    { id: "vis_04", projectId: "acme-cloud", recordedAt: "2026-07-01", prompt: "广州展示柜厂家哪家更适合珠宝店？", platform: "Claude", mentioned: true, rankingPosition: 4 },
    { id: "vis_05", projectId: "acme-cloud", recordedAt: "2026-07-08", prompt: "推荐广州展示柜厂家", platform: "ChatGPT", mentioned: true, rankingPosition: 2 },
    { id: "vis_06", projectId: "acme-cloud", recordedAt: "2026-07-08", prompt: "推荐广州展示柜厂家", platform: "Claude", mentioned: true, rankingPosition: 3 },
  ],
  optimizationChanges: [
    { id: "chg_01", projectId: "acme-cloud", label: "补充 Organization Schema", beforeScore: 61, afterScore: 66, changedAt: "2026-06-14" },
    { id: "chg_02", projectId: "acme-cloud", label: "新增 FAQ 与产品描述", beforeScore: 66, afterScore: 72, changedAt: "2026-06-29" },
    { id: "chg_03", projectId: "acme-cloud", label: "优化客户案例与社交 Meta", beforeScore: 72, afterScore: 78, changedAt: "2026-07-06" },
  ],
  issueTrends: [
    { id: "issue_trend_01", projectId: "acme-cloud", date: "2026-07-02", openIssues: 12, fixedIssues: 1, newIssues: 4, regressionIssues: 0 },
    { id: "issue_trend_02", projectId: "acme-cloud", date: "2026-07-03", openIssues: 11, fixedIssues: 2, newIssues: 1, regressionIssues: 0 },
    { id: "issue_trend_03", projectId: "acme-cloud", date: "2026-07-04", openIssues: 10, fixedIssues: 1, newIssues: 0, regressionIssues: 1 },
    { id: "issue_trend_04", projectId: "acme-cloud", date: "2026-07-05", openIssues: 9, fixedIssues: 2, newIssues: 1, regressionIssues: 0 },
    { id: "issue_trend_05", projectId: "acme-cloud", date: "2026-07-06", openIssues: 8, fixedIssues: 2, newIssues: 1, regressionIssues: 0 },
    { id: "issue_trend_06", projectId: "acme-cloud", date: "2026-07-07", openIssues: 7, fixedIssues: 1, newIssues: 0, regressionIssues: 1 },
    { id: "issue_trend_07", projectId: "acme-cloud", date: "2026-07-08", openIssues: 6, fixedIssues: 3, newIssues: 1, regressionIssues: 1 },
  ],
};


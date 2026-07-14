import { mockProjects } from "@/data/projects";

export const dashboardMetrics = [
  { label: "跟踪项目", value: "24", delta: "+12.5%", tone: "cyan" },
  { label: "AI 可见性", value: "78.4%", delta: "+8.2%", tone: "emerald" },
  { label: "问题覆盖", value: "1,284", delta: "+126", tone: "violet" },
  { label: "待处理发现", value: "37", delta: "-9", tone: "amber" },
];

export const projectDashboardStats = {
  totalProjects: mockProjects.length,
  totalReports: mockProjects.reduce((total, project) => total + project.reportsCount, 0),
  lastAnalysis: mockProjects
    .map((project) => project.lastAnalysisAt)
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0],
  averageGeoScore: Math.round(mockProjects.reduce((total, project) => total + project.geoScore, 0) / mockProjects.length),
};

export const visibilitySeries = [72, 74, 70, 76, 81, 78, 84, 88, 86, 91, 89, 94];

export const projects = mockProjects.map((project) => ({
  name: project.name,
  domain: new URL(project.websiteUrl).hostname,
  status: project.status,
  visibility: `${project.geoScore}%`,
  prompts: project.reportsCount * 37 + 16,
  owner: "GeoPilot 团队",
}));

export const analysisItems = [
  { topic: "品牌答案一致性", score: 91, trend: "强", engine: "企业搜索" },
  { topic: "竞品共同提及", score: 64, trend: "需要复核", engine: "答案引擎" },
  { topic: "引用新鲜度", score: 77, trend: "稳定", engine: "AI 摘要" },
  { topic: "知识缺口覆盖", score: 58, trend: "观察", engine: "长问题提示" },
];

export const reports = [
  { title: "管理层可见性简报", cadence: "每周", audience: "管理层", status: "已就绪" },
  { title: "问题集群表现", cadence: "每月", audience: "增长团队", status: "草稿" },
  { title: "竞品声量份额", cadence: "每月", audience: "策略团队", status: "已就绪" },
];

export const apiKeys = [
  { name: "生产工作空间", prefix: "gpk_live_8f3a", created: "2026年7月8日", lastUsed: "2 小时前" },
  { name: "分析沙盒", prefix: "gpk_test_1c92", created: "2026年7月2日", lastUsed: "昨天" },
];

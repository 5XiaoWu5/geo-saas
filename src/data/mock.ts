import { mockProjects } from "@/data/projects";

export const dashboardMetrics = [
  { label: "Tracked Projects", value: "24", delta: "+12.5%", tone: "cyan" },
  { label: "Engine Visibility", value: "78.4%", delta: "+8.2%", tone: "emerald" },
  { label: "Prompt Coverage", value: "1,284", delta: "+126", tone: "violet" },
  { label: "Open Findings", value: "37", delta: "-9", tone: "amber" },
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
  owner: "GeoPilot Team",
}));

export const analysisItems = [
  { topic: "Brand answer consistency", score: 91, trend: "Strong", engine: "Enterprise search" },
  { topic: "Competitor co-mentions", score: 64, trend: "Needs review", engine: "Answer engines" },
  { topic: "Citation freshness", score: 77, trend: "Stable", engine: "AI summaries" },
  { topic: "Knowledge gap coverage", score: 58, trend: "Watch", engine: "Long-form prompts" },
];

export const reports = [
  { title: "Executive Visibility Brief", cadence: "Weekly", audience: "Leadership", status: "Ready" },
  { title: "Prompt Cluster Performance", cadence: "Monthly", audience: "Growth", status: "Draft" },
  { title: "Competitive Share of Voice", cadence: "Monthly", audience: "Strategy", status: "Ready" },
];

export const apiKeys = [
  { name: "Production workspace", prefix: "gpk_live_8f3a", created: "Jun 18, 2026", lastUsed: "2 hours ago" },
  { name: "Analytics sandbox", prefix: "gpk_test_1c92", created: "Jun 02, 2026", lastUsed: "Yesterday" },
];

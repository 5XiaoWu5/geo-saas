import type { Project } from "@/types/project";

export function toProject(row: Record<string, unknown>): Project {
  const createdAt = row.createdAt instanceof Date ? row.createdAt : new Date(String(row.createdAt));
  const lastAnalysisAt = row.lastAnalysisAt ? (row.lastAnalysisAt instanceof Date ? row.lastAnalysisAt : new Date(String(row.lastAnalysisAt))) : null;
  const lastScan = row.lastScan ? (row.lastScan instanceof Date ? row.lastScan : new Date(String(row.lastScan))) : null;
  const websiteUrl = String(row.domain);

  return {
    id: String(row.id),
    workspaceId: String(row.userId ?? "user-workspace"),
    name: String(row.name),
    websiteUrl,
    url: websiteUrl,
    language: String(row.language ?? "English") as Project["language"],
    country: String(row.country ?? "United States") as Project["country"],
    industry: String(row.industry ?? "SaaS") as Project["industry"],
    description: String(row.description ?? ""),
    createdAt: createdAt.toISOString(),
    lastAnalysisAt: lastAnalysisAt?.toISOString() ?? null,
    lastScan: lastScan?.toISOString() ?? null,
    reportsCount: Number(row.reportsCount ?? 0),
    geoScore: Number(row.geoScore ?? 0),
    visibilityScore: Number(row.visibilityScore ?? row.visibility ?? 0),
    status: String(row.status ?? "Active") as Project["status"],
  };
}

export function getProjectStatusLabel(status: Project["status"] | string) {
  const labels: Record<string, string> = {
    Active: "运行中",
    Monitoring: "监控中",
    Paused: "已暂停",
    draft: "草稿",
  };

  return labels[status] ?? String(status);
}


export function getProjectLanguageLabel(language: Project["language"] | string) {
  const labels: Record<string, string> = {
    English: "英文",
    Chinese: "中文",
    Spanish: "西班牙语",
    German: "德语",
    Japanese: "日语",
  };

  return labels[language] ?? String(language);
}

export function getProjectCountryLabel(country: Project["country"] | string) {
  const labels: Record<string, string> = {
    "United States": "美国",
    China: "中国",
    "United Kingdom": "英国",
    Germany: "德国",
    Japan: "日本",
    Singapore: "新加坡",
  };

  return labels[country] ?? String(country);
}

export function getProjectIndustryLabel(industry: Project["industry"] | string) {
  const labels: Record<string, string> = {
    SaaS: "软件服务",
    Fintech: "金融科技",
    Healthcare: "医疗健康",
    "E-commerce": "电子商务",
    Education: "教育培训",
    Manufacturing: "制造业",
  };

  return labels[industry] ?? String(industry);
}

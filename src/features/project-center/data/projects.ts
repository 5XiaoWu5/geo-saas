import type { Project } from "@/types/project";

// 真实项目数据来自 Neon 数据库（/api/projects）。此处不再保留任何测试/示例项目，
// 避免 acmecloud.com、northstarcrm.io 等假域名出现在真实产品中。
export const projects: Project[] = [];

export function createProject(values: Pick<Project, "name" | "websiteUrl" | "language" | "country" | "industry" | "description">): Project {
  return { ...values, workspaceId: "ws_geo_enterprise", id: `prj_${Date.now()}`, url: values.websiteUrl, createdAt: new Date().toISOString(), lastAnalysisAt: null, lastScan: null, reportsCount: 0, geoScore: 72, visibilityScore: 50, status: "Active" };
}


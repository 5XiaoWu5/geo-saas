import type { Project } from "@/types/project";

export const QUERY_CATEGORIES = ["品牌认知", "产品推荐", "行业咨询", "购买决策", "对比竞品", "地区搜索"] as const;

export type QueryCategory = (typeof QUERY_CATEGORIES)[number];
export type QueryPriority = "high" | "medium" | "low";
export type QueryStatus = "GENERATED" | "IMPORTED";

export type QueryTemplate = {
  id: string;
  projectId: string;
  content: string;
  category: QueryCategory | string;
  intent: string;
  priority: QueryPriority | string;
  status: QueryStatus | string;
  createdAt: string;
  updatedAt: string;
};

export type QueryGeneratorProject = Pick<Project, "id" | "name" | "websiteUrl" | "industry" | "description" | "geoScore" | "visibilityScore" | "country">;

export type GeneratedQueryDraft = {
  content: string;
  category: QueryCategory;
  intent: string;
  priority: QueryPriority;
};


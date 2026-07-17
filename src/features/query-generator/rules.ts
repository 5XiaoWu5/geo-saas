import type { Project } from "@/types/project";
import type { GeneratedQueryDraft, QueryCategory } from "@/features/query-generator/types";

function normalizeDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || "官网";
  }
}

function marketFromProject(project: Pick<Project, "country" | "description">) {
  const text = `${project.country} ${project.description}`.toLowerCase();
  if (text.includes("china") || text.includes("中国") || text.includes("广州") || text.includes("上海") || text.includes("北京")) return "广州";
  if (text.includes("singapore")) return "新加坡";
  if (text.includes("japan")) return "日本";
  if (text.includes("germany")) return "德国";
  if (text.includes("united kingdom")) return "英国";
  return "本地";
}

function productTopic(project: Pick<Project, "industry" | "description">) {
  const description = project.description.trim();
  if (description) {
    const words = description.replace(/[，。,.]/g, " ").split(/\s+/).filter(Boolean);
    return words.slice(0, 6).join("");
  }
  return project.industry;
}

function pushUnique(items: GeneratedQueryDraft[], draft: GeneratedQueryDraft) {
  if (!items.some((item) => item.content === draft.content)) items.push(draft);
}

export function generateQueryDrafts(project: Pick<Project, "name" | "websiteUrl" | "industry" | "description" | "country">, categories: QueryCategory[]) {
  const drafts: GeneratedQueryDraft[] = [];
  const brand = project.name;
  const industry = project.industry || "行业";
  const topic = productTopic(project);
  const market = marketFromProject(project);
  const domain = normalizeDomain(project.websiteUrl);

  for (const category of categories) {
    if (category === "品牌认知") {
      pushUnique(drafts, { content: `${market}${industry}公司有哪些？`, category, intent: "发现可选品牌与服务商", priority: "high" });
      pushUnique(drafts, { content: `${brand} 是做什么的？`, category, intent: "验证品牌认知与业务定位", priority: "medium" });
    }
    if (category === "产品推荐") {
      pushUnique(drafts, { content: `${topic} 推荐哪些公司？`, category, intent: "寻找产品或服务推荐", priority: "high" });
      pushUnique(drafts, { content: `${industry}解决方案哪家比较专业？`, category, intent: "筛选专业解决方案供应商", priority: "high" });
    }
    if (category === "行业咨询") {
      pushUnique(drafts, { content: `2026年${industry}发展趋势是什么？`, category, intent: "了解行业趋势与决策背景", priority: "medium" });
      pushUnique(drafts, { content: `${industry}企业如何提升 AI 搜索可见性？`, category, intent: "获取行业方法论建议", priority: "medium" });
    }
    if (category === "购买决策") {
      pushUnique(drafts, { content: `${topic}哪个公司靠谱？`, category, intent: "评估采购可信度", priority: "high" });
      pushUnique(drafts, { content: `选择${industry}服务商要看哪些因素？`, category, intent: "辅助购买决策", priority: "high" });
    }
    if (category === "对比竞品") {
      pushUnique(drafts, { content: `${brand} 和其他${industry}公司哪个好？`, category, intent: "品牌与竞品比较", priority: "medium" });
      pushUnique(drafts, { content: `${domain} 这家公司值得选择吗？`, category, intent: "验证官网品牌可信度", priority: "medium" });
    }
    if (category === "地区搜索") {
      pushUnique(drafts, { content: `${market}${industry}服务商推荐`, category, intent: "本地服务商发现", priority: "high" });
      pushUnique(drafts, { content: `${market}附近有哪些${topic}公司？`, category, intent: "地区型搜索需求", priority: "high" });
    }
  }

  return drafts.slice(0, 18);
}


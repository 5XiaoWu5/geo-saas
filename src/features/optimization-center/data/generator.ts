import type { GEOIssue } from "@/features/geo-engine/core";
import type { GeoAnalyzerReport } from "@/features/geo-analyzer/types";
import type { VisibilityMonitorData } from "@/features/visibility-monitor/types";
import type { GeneratedContent, GeneratedSchema, OptimizationCenterData, OptimizationPriority, OptimizationTask } from "@/features/optimization-center/types";

function inferPriority(text: string): OptimizationPriority {
  if (text.includes("High") || text.includes("critical") || text.includes("客户案例") || text.includes("Missing")) return "High";
  if (text.includes("Medium") || text.includes("warning") || text.includes("Meta") || text.includes("schema")) return "Medium";
  return "Low";
}

export function generateOptimizationTasks(report: GeoAnalyzerReport, visibility: VisibilityMonitorData, auditIssues: GEOIssue[] = []): OptimizationTask[] {
  const auditTasks = auditIssues.map((issue, index) => ({
    id: `audit_task_${issue.id}`,
    title: issue.recommendation.slice(0, 96),
    description: `${issue.title}: ${issue.description}`,
    source: "GEO Engine" as const,
    priority: issue.severity === "critical" ? "High" as const : issue.severity === "warning" ? "Medium" as const : "Low" as const,
    estimatedLift: issue.severity === "critical" ? 10 : issue.severity === "warning" ? 6 : 3,
    status: index === 3 ? "Done" as const : "Todo" as const,
    issueId: issue.id,
    completedAt: index === 3 ? "2026-07-08T09:30:00.000Z" : null,
  }));

  const geoTasks = auditTasks.length ? [] : report.score.recommendations.slice(0, 5).map((recommendation, index) => ({
    id: `geo_task_${index}`,
    title: recommendation.replace(/^\[[^\]]+\]\s*/, "").slice(0, 84),
    description: report.score.issues[index] ?? recommendation,
    source: "GEO Engine" as const,
    priority: inferPriority(recommendation),
    estimatedLift: Math.max(3, 10 - index),
    status: index === 3 ? "Done" as const : "Todo" as const,
    completedAt: index === 3 ? "2026-07-08T09:30:00.000Z" : null,
  }));

  const weakVisibility = visibility.trackingResults.filter((result) => !result.brandMentioned || result.recommendationPosition === null);
  const visibilityTasks = weakVisibility.map((result, index) => ({
    id: `visibility_task_${index}`,
    title: `提升 ${result.platform} 对“${result.prompt}”的品牌推荐概率`,
    description: result.reasonAnalysis,
    source: "Visibility Monitor" as const,
    priority: "High" as const,
    estimatedLift: 8 - index,
    status: "Todo" as const,
    completedAt: null,
  }));

  return [...auditTasks, ...geoTasks, ...visibilityTasks];
}

export function generateMockContent(tasks: OptimizationTask[]): GeneratedContent[] {
  return [
    { id: "content_faq_01", type: "FAQ", title: "展示柜厂家常见问题 FAQ", targetTaskId: tasks[0]?.id ?? "geo_task_0", content: "Q: 如何选择广州展示柜厂家？\nA: 建议从工厂资质、行业案例、材料工艺、安装能力和售后响应五个维度评估，并优先选择能提供完整设计、生产、交付流程的厂家。" },
    { id: "content_company_01", type: "Company Intro", title: "企业介绍模块", targetTaskId: tasks[1]?.id ?? "geo_task_1", content: "广州星河展示柜有限公司专注商业展示柜定制，为珠宝、美妆、博物馆与零售空间提供设计、制造、安装与维护一体化服务。" },
    { id: "content_product_01", type: "Product Description", title: "珠宝展示柜产品描述", targetTaskId: tasks[2]?.id ?? "geo_task_2", content: "珠宝展示柜采用高透玻璃、稳定灯光系统与安全锁具结构，适用于商场专柜、品牌门店与高端陈列空间。" },
    { id: "content_blog_01", type: "Blog Article", title: "如何判断展示柜厂家是否可靠", targetTaskId: tasks[3]?.id ?? "geo_task_3", content: "可靠的展示柜厂家通常具备明确工厂地址、可验证项目案例、完整报价流程、材料说明和售后服务机制。" },
  ];
}

export function generateMockSchemas(tasks: OptimizationTask[]): GeneratedSchema[] {
  return [
    { id: "schema_org_01", type: "Organization Schema", targetTaskId: tasks[0]?.id ?? "geo_task_0", jsonLd: JSON.stringify({ "@context": "https://schema.org", "@type": "Organization", name: "广州星河展示柜有限公司", address: "中国广东广州", areaServed: "China" }, null, 2) },
    { id: "schema_product_01", type: "Product Schema", targetTaskId: tasks[1]?.id ?? "geo_task_1", jsonLd: JSON.stringify({ "@context": "https://schema.org", "@type": "Product", name: "珠宝展示柜定制", category: "Commercial Display Cabinet" }, null, 2) },
    { id: "schema_faq_01", type: "FAQ Schema", targetTaskId: tasks[2]?.id ?? "geo_task_2", jsonLd: JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: [{ "@type": "Question", name: "如何选择广州展示柜厂家？", acceptedAnswer: { "@type": "Answer", text: "从资质、案例、工艺、交付和售后能力综合判断。" } }] }, null, 2) },
  ];
}

export function buildOptimizationCenterData(report: GeoAnalyzerReport, visibility: VisibilityMonitorData, auditIssues: GEOIssue[] = []): OptimizationCenterData {
  const tasks = generateOptimizationTasks(report, visibility, auditIssues);
  const todoTasks = tasks.filter((task) => task.status === "Todo").length;
  const doneTasks = tasks.filter((task) => task.status === "Done").length;

  return { tasks, generatedContent: generateMockContent(tasks), generatedSchemas: generateMockSchemas(tasks), stats: { todoTasks, doneTasks, predictedGeoLift: tasks.filter((task) => task.status === "Todo").reduce((total, task) => total + task.estimatedLift, 0) } };
}




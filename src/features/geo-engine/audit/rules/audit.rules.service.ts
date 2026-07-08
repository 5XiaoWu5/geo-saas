import type { DraftGEOIssue, GEOIssue } from "@/features/geo-engine/audit/types/audit.types";
import { executeRules, getRegisteredRules, registerRule } from "@/features/geo-engine/audit/rules/rule.registry";
import type { WebsiteGEOResult } from "@/features/geo-engine/types/scan.types";

function toIssue(input: DraftGEOIssue): GEOIssue {
  return {
    projectId: input.projectId,
    scanId: input.scanId,
    category: input.category,
    severity: input.severity,
    title: input.title,
    description: input.description,
    recommendation: input.recommendation,
    id: `issue_${input.scanId}_${input.category}_${input.title}`.replace(/\W+/g, "_").toLowerCase(),
    evidenceIds: [],
    evidence: input.evidence.map((item, index) => ({ ...item, id: `draft_evidence_${index}`, issueId: "draft" })),
    status: "open",
  };
}

function createDefaultIssues(projectId: string, result: WebsiteGEOResult): DraftGEOIssue[] {
  const issues: DraftGEOIssue[] = [];
  const firstPage = result.pageScores[0];
  const organizationEntities = result.entities.filter((entity) => entity.type === "Organization");
  const hasOrganizationSchema = result.entities.some((entity) => entity.type === "Organization" && entity.source === "schema");
  const weakPages = result.pageScores.filter((page) => page.contentScore < 72);
  const lowReadabilityPages = result.pageScores.filter((page) => page.aiReadabilityScore < 75);

  if (result.entityScore < 75 || !organizationEntities.length) {
    issues.push({ projectId, scanId: result.scanId, category: "Entity", severity: "critical", title: "缺少完整组织实体信息", description: "网站未能稳定表达品牌主体、公司名称或核心服务关系。", evidence: [{ url: firstPage?.url ?? "/", finding: `Entity score is ${result.entityScore}`, location: "Entity analysis" }], recommendation: "在首页、关于我们和联系页面补充统一公司名称、地址、服务范围和组织结构化数据。" });
  }

  if (!hasOrganizationSchema || result.schemaScore < 80) {
    issues.push({ projectId, scanId: result.scanId, category: "Schema", severity: "critical", title: "缺少 Organization Schema", description: "扫描结果未发现稳定有效的 Organization Schema。", evidence: [{ url: firstPage?.url ?? "/", finding: `Schema score is ${result.schemaScore}`, location: "application/ld+json" }], recommendation: "添加 Organization JSON-LD，包含 name、url、logo、address、sameAs 和 contactPoint。" });
  }

  for (const page of weakPages.slice(0, 3)) {
    issues.push({ projectId, scanId: result.scanId, category: "Content", severity: "warning", title: "内容深度不足", description: "页面正文可能不足以支撑 AI 搜索回答引用。", evidence: [{ url: page.url, finding: `Content score is ${page.contentScore}`, location: "body content" }], recommendation: "增加直接回答、产品细节、案例证明、FAQ 和结构化摘要。" });
  }

  if (result.citationPotential < 75) {
    issues.push({ projectId, scanId: result.scanId, category: "Citation", severity: "warning", title: "引用潜力不足", description: "网站缺少足够可被 AI 搜索引用的外部权威和客户证明。", evidence: [{ url: firstPage?.url ?? "/", finding: `Citation potential is ${result.citationPotential}`, location: "links and evidence" }], recommendation: "增加客户案例、媒体报道、行业协会链接和第三方平台资料。" });
  }

  for (const page of lowReadabilityPages.slice(0, 2)) {
    issues.push({ projectId, scanId: result.scanId, category: "AI_Readability", severity: "suggestion", title: "AI 可读性结构不足", description: "页面标题层级或摘要结构不够清晰。", evidence: [{ url: page.url, finding: `AI readability score is ${page.aiReadabilityScore}`, location: "headings / summaries" }], recommendation: "使用清晰 H2/H3、简短段落、列表和问答格式提升 AI 可读性。" });
  }

  if (result.pageScores.length < 5) {
    issues.push({ projectId, scanId: result.scanId, category: "Structure", severity: "suggestion", title: "可发现页面数量偏少", description: "当前扫描发现的内部页面数量较少，可能影响站点主题覆盖。", evidence: [{ url: firstPage?.url ?? "/", finding: `${result.pageScores.length} pages discovered`, location: "internal links" }], recommendation: "补充产品、案例、关于、FAQ、资源文章等页面，并加强内部链接。" });
  }

  return issues;
}

function ensureDefaultRules(): void {
  if (getRegisteredRules().some((rule) => rule.id === "default-geo-audit")) return;

  registerRule({
    id: "default-geo-audit",
    category: "Structure",
    severity: "warning",
    enabled: true,
    industry: "all",
    evaluate: createDefaultIssues,
  });
}

export function runAuditRules(projectId: string, result: WebsiteGEOResult): GEOIssue[] {
  ensureDefaultRules();
  return executeRules(projectId, result).map(toIssue);
}


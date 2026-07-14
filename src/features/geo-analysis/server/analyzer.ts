import type { GeoAnalysisResult, GeoIssue } from "@/features/geo-analysis/types";
import type { WebsiteScan } from "@/features/website-crawl/types";

function hasSchema(scan: Pick<WebsiteScan, "schemaTypes">, type: string) {
  return scan.schemaTypes.some((schemaType) => schemaType.toLowerCase() === type.toLowerCase());
}

function addIssue(issues: GeoIssue[], category: GeoIssue["category"], severity: GeoIssue["severity"], title: string, description: string) {
  issues.push({ category, severity, title, description });
}

function clamp(value: number, max: number) {
  return Math.max(0, Math.min(max, value));
}

export function analyzeWebsiteScan(scan: WebsiteScan): GeoAnalysisResult {
  const issues: GeoIssue[] = [];

  let entityScore = 0;
  if (hasSchema(scan, "Organization")) entityScore += 12;
  else addIssue(issues, "entity", "critical", "缺少 Organization 结构化数据", "AI 搜索引擎难以确认网站对应的企业实体。建议补充 Organization Schema。");

  if (scan.title && scan.title.trim().length >= 4) entityScore += 6;
  else addIssue(issues, "entity", "warning", "品牌标题信号不足", "页面标题未提供清晰品牌或业务信息，会降低企业实体识别稳定性。");

  if (scan.internalLinkCount >= 3) entityScore += 6;
  else addIssue(issues, "entity", "suggestion", "关于页面信号不足", "当前扫描发现的内部链接偏少，建议确保关于我们、公司介绍等页面可被首页链接发现。");

  if (scan.externalLinkCount > 0 || scan.internalLinkCount >= 5) entityScore += 6;
  else addIssue(issues, "entity", "suggestion", "联系与权威证明不足", "建议在网站中补充联系方式、资质证明、客户案例或第三方权威入口。");
  entityScore = clamp(entityScore, 30);

  let schemaScore = 0;
  if (hasSchema(scan, "Organization")) schemaScore += 7;
  else addIssue(issues, "schema", "critical", "未检测到 Organization Schema", "企业官网需要 Organization Schema 帮助 AI 建立品牌知识图谱。");
  if (hasSchema(scan, "Product")) schemaScore += 6;
  else addIssue(issues, "schema", "suggestion", "未检测到 Product Schema", "如果网站包含产品或服务页面，建议增加 Product Schema。");
  if (hasSchema(scan, "FAQPage") || hasSchema(scan, "FAQ")) schemaScore += 6;
  else addIssue(issues, "schema", "suggestion", "未检测到 FAQ Schema", "FAQ 结构能提升 AI 回答中引用网站内容的概率。");
  if (hasSchema(scan, "Article")) schemaScore += 6;
  else addIssue(issues, "schema", "suggestion", "未检测到 Article Schema", "内容型页面建议使用 Article Schema 增强主题覆盖。");
  schemaScore = clamp(schemaScore, 25);

  let technicalScore = 0;
  if (scan.robotsExists) technicalScore += 5;
  else addIssue(issues, "technical", "warning", "未发现 robots.txt", "robots.txt 能帮助搜索引擎和 AI 抓取器理解站点访问规则。");
  if (scan.sitemapExists) technicalScore += 5;
  else addIssue(issues, "technical", "warning", "未发现 sitemap.xml", "站点地图可以提升重要页面被发现和持续更新的效率。");
  if (scan.title) technicalScore += 5;
  else addIssue(issues, "technical", "critical", "页面缺少 Title", "Title 是搜索引擎和 AI 摘要识别页面主题的核心信号。");
  if (scan.description) technicalScore += 5;
  else addIssue(issues, "technical", "warning", "页面缺少 Meta Description", "Meta Description 有助于 AI 理解页面摘要和业务定位。");
  addIssue(issues, "technical", "suggestion", "Canonical 信号待补充", "当前扫描模型尚未保存 Canonical 字段，建议下一版扫描器加入 canonical 检测。");
  technicalScore = clamp(technicalScore, 25);

  let contentScore = 0;
  if (scan.h1Count > 0) contentScore += 5;
  else addIssue(issues, "content", "critical", "页面缺少 H1", "页面需要唯一清晰的 H1 帮助 AI 理解主主题。");
  if (scan.h2Count > 0) contentScore += 5;
  else addIssue(issues, "content", "warning", "页面缺少 H2 层级", "H2 能形成更清晰的内容结构，便于 AI 抽取要点。");
  if ((scan.description?.length ?? 0) >= 80 || scan.h2Count >= 3) contentScore += 5;
  else addIssue(issues, "content", "suggestion", "内容深度信号不足", "当前扫描结果显示摘要或标题层级较弱，建议增加更完整的服务说明和 FAQ 内容。");
  if (scan.internalLinkCount > 0) contentScore += scan.internalLinkCount >= 4 ? 5 : 3;
  else addIssue(issues, "content", "warning", "内部链接不足", "内部链接可以帮助 AI 抓取器发现更多上下文页面。");
  contentScore = clamp(contentScore, 20);

  const totalScore = clamp(entityScore + schemaScore + technicalScore + contentScore, 100);

  return { totalScore, entityScore, schemaScore, technicalScore, contentScore, issues };
}

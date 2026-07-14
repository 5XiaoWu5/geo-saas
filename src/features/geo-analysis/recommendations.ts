import type { GeoIssue, GeoIssueCategory } from "@/features/geo-analysis/types";

export type DiagnosedIssue = GeoIssue & { recommendation: string };

export type OptimizationSuggestion = {
  category: GeoIssueCategory;
  severity: GeoIssue["severity"];
  title: string;
  recommendation: string;
};

const CATEGORY_LABELS: Record<GeoIssueCategory, string> = {
  entity: "实体智能",
  schema: "结构化数据",
  technical: "技术 GEO",
  content: "内容结构",
};

const SEVERITY_WEIGHT: Record<GeoIssue["severity"], number> = {
  critical: 3,
  warning: 2,
  suggestion: 1,
};

// 规则引擎：根据问题标题/分类匹配可执行的优化建议。不接任何 AI API。
const RULES: { match: (issue: GeoIssue) => boolean; recommendation: string }[] = [
  {
    match: (issue) => issue.title.includes("Organization"),
    recommendation: "在网站首页 <head> 中加入 Organization JSON-LD，填写 name、url、logo、sameAs（官方社交主页），帮助 AI 建立品牌实体。",
  },
  {
    match: (issue) => issue.title.includes("Product"),
    recommendation: "为产品或服务页面添加 Product / Service JSON-LD，包含 name、description、brand，提升 AI 对产品信息的抽取与引用。",
  },
  {
    match: (issue) => issue.title.includes("FAQ"),
    recommendation: "整理高频问题，使用 FAQPage JSON-LD 标注问答对，AI 摘要更容易直接引用你的答案。",
  },
  {
    match: (issue) => issue.title.includes("Article"),
    recommendation: "为内容型页面加入 Article JSON-LD（headline、author、datePublished），增强主题覆盖与时效信号。",
  },
  {
    match: (issue) => issue.title.includes("robots.txt"),
    recommendation: "在站点根目录发布 robots.txt，明确允许主流搜索与 AI 抓取器访问，并在其中声明 Sitemap 地址。",
  },
  {
    match: (issue) => issue.title.includes("sitemap"),
    recommendation: "生成并提交 sitemap.xml，列出全部重要页面与更新时间，帮助 AI 抓取器持续发现内容。",
  },
  {
    match: (issue) => issue.title.includes("Title") || issue.title.includes("标题"),
    recommendation: "为页面设置唯一、含品牌与核心业务关键词的 <title>（建议 30-60 字符），这是 AI 识别页面主题的核心信号。",
  },
  {
    match: (issue) => issue.title.includes("Meta Description"),
    recommendation: "补充 150 字左右的 meta description，用一句话概括页面业务定位，提升 AI 摘要准确度。",
  },
  {
    match: (issue) => issue.title.includes("Canonical"),
    recommendation: "为每个页面设置 canonical 链接，避免重复内容分散权重，稳定 AI 对规范页面的识别。",
  },
  {
    match: (issue) => issue.title.includes("H1"),
    recommendation: "为页面添加唯一且清晰的 H1，直接点明页面主题，帮助 AI 快速理解主内容。",
  },
  {
    match: (issue) => issue.title.includes("H2"),
    recommendation: "使用 H2 划分内容小节（如产品、优势、案例、FAQ），形成清晰层级，便于 AI 抽取要点。",
  },
  {
    match: (issue) => issue.title.includes("内部链接") || issue.title.includes("关于页面"),
    recommendation: "在首页与导航中补充指向「关于我们」「产品」「联系我们」等核心页面的内部链接，帮助抓取器发现更多上下文。",
  },
  {
    match: (issue) => issue.title.includes("内容深度"),
    recommendation: "扩充页面正文，补充服务说明、使用场景与常见问题，提升内容深度与 AI 引用价值。",
  },
  {
    match: (issue) => issue.title.includes("联系") || issue.title.includes("权威"),
    recommendation: "补充联系方式、资质证明、客户案例与第三方权威链接，增强企业可信度与被引用概率。",
  },
  {
    match: (issue) => issue.title.includes("品牌标题"),
    recommendation: "在标题与首屏文案中明确品牌名与核心业务，强化 AI 对企业实体的识别稳定性。",
  },
];

const CATEGORY_FALLBACK: Record<GeoIssueCategory, string> = {
  entity: "完善企业实体信息（品牌名、简介、联系方式、权威链接），帮助 AI 稳定识别你的企业。",
  schema: "补充相应的结构化数据（JSON-LD），提升 AI 对页面内容的理解与引用。",
  technical: "完善技术 GEO 基础（robots.txt、sitemap.xml、title、meta description、canonical）。",
  content: "优化内容结构（H1/H2 层级、正文深度、内部链接），提升 AI 可读性。",
};

export function recommendForIssue(issue: GeoIssue): string {
  return RULES.find((rule) => rule.match(issue))?.recommendation ?? CATEGORY_FALLBACK[issue.category];
}

export function diagnoseIssues(issues: GeoIssue[]): DiagnosedIssue[] {
  return issues.map((issue) => ({ ...issue, recommendation: recommendForIssue(issue) }));
}

// 优化建议区域：按严重程度排序，优先展示影响最大的改进项。
export function buildOptimizationSuggestions(issues: GeoIssue[]): OptimizationSuggestion[] {
  return diagnoseIssues(issues)
    .map((issue) => ({ category: issue.category, severity: issue.severity, title: issue.title, recommendation: issue.recommendation }))
    .sort((left, right) => SEVERITY_WEIGHT[right.severity] - SEVERITY_WEIGHT[left.severity]);
}

export function categoryLabel(category: GeoIssueCategory): string {
  return CATEGORY_LABELS[category];
}

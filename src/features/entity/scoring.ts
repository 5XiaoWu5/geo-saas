import type { GeoAnalysis } from "@/features/geo-analysis/types";
import type { EntityAttribute, EntityMissingItem, EntityProfile, EntityScore } from "@/features/entity/types";
import type { WebsiteScan } from "@/features/website-crawl/types";
import type { Project } from "@/types/project";

type EntityInputs = {
  project: Project;
  scan: WebsiteScan | null;
  analysis: GeoAnalysis | null;
  profile: EntityProfile | null;
  attributes: EntityAttribute[];
};

function hasText(value: unknown) {
  return typeof value === "string" && value.trim().length >= 2;
}

function hasLongText(value: unknown, minLength = 40) {
  return typeof value === "string" && value.trim().length >= minLength;
}

function hasList(items: string[] | undefined, minItems = 1) {
  return Array.isArray(items) && items.filter((item) => item.trim()).length >= minItems;
}

function hasAttribute(attributes: EntityAttribute[], key: string) {
  return attributes.some((attribute) => attribute.key === key && hasText(attribute.value));
}

function hasAttributeLike(attributes: EntityAttribute[], keys: string[]) {
  return attributes.some((attribute) => keys.includes(attribute.key) && hasText(attribute.value));
}

function missingItem(key: string, title: string, description: string, recommendation: string, severity: EntityMissingItem["severity"] = "Medium"): EntityMissingItem {
  return {
    key,
    title,
    description,
    recommendation,
    severity,
    category: "entity",
  };
}

export function buildEntityScore({ project, scan, analysis, profile, attributes }: EntityInputs): EntityScore {
  const missingItems: EntityMissingItem[] = [];
  const brandName = profile?.brandName || project.name;
  const industry = profile?.industry || project.industry;
  const region = profile?.region || project.country;
  const description = profile?.description || project.description || scan?.description || "";
  const services = profile?.services ?? [];
  const products = profile?.products ?? [];
  const advantages = profile?.advantages ?? [];
  const hasFaq = hasAttribute(attributes, "faq");
  const hasCases = hasAttribute(attributes, "case");
  const hasContact = hasAttribute(attributes, "contact");
  const hasServicePage = hasAttribute(attributes, "servicePage");
  const hasThirdParty = hasAttributeLike(attributes, ["thirdParty", "media", "review", "certification"]);

  let brandScore = 0;
  if (hasText(brandName)) brandScore += 6;
  if (hasText(project.websiteUrl)) brandScore += 4;
  if (hasText(industry)) brandScore += 4;
  if (hasText(region)) brandScore += 3;
  if (hasLongText(description, 30)) brandScore += 3;
  if (!hasLongText(description, 30)) {
    missingItems.push(missingItem(
      "brand-description",
      "缺少品牌描述",
      "企业实体缺少可被 AI 理解的品牌定位、主营方向和推荐理由。",
      "补充一段清晰的品牌描述，说明企业是谁、服务谁、解决什么问题以及核心差异。",
      "High",
    ));
  }

  let businessScore = 0;
  if (hasList(services)) businessScore += 8;
  if (hasLongText(description, 80)) businessScore += 5;
  if (hasList(advantages)) businessScore += 4;
  if (hasServicePage || (scan?.internalLinkCount ?? 0) >= 5) businessScore += 3;
  if (!hasList(services)) {
    missingItems.push(missingItem(
      "services",
      "缺少主营业务",
      "当前企业档案没有明确列出主营业务或服务范围。",
      "补充 3-6 个主营业务，并在官网创建对应服务页面，便于 AI 建立服务实体关系。",
      "High",
    ));
  }
  if (!hasServicePage && (scan?.internalLinkCount ?? 0) < 5) {
    missingItems.push(missingItem(
      "service-page",
      "缺少服务页面信号",
      "网站抓取结果和实体档案中都没有足够的服务页面证据。",
      "为核心服务创建独立页面，包含服务对象、流程、交付标准、案例和 FAQ。",
    ));
  }

  let productsScore = 0;
  if (hasList(products)) productsScore += 8;
  if (hasList(services, 2)) productsScore += 4;
  if (hasFaq) productsScore += 4;
  if (hasCases) productsScore += 4;
  if (!hasList(products)) {
    missingItems.push(missingItem(
      "products",
      "缺少产品或服务清单",
      "AI 难以判断企业具体提供哪些产品、方案或服务包。",
      "创建产品/服务清单，包含名称、用途、优势、应用场景、适用客户和常见问题。",
      "High",
    ));
  }
  if (!hasFaq) {
    missingItems.push(missingItem(
      "faq",
      "缺少 FAQ",
      "实体档案和抓取数据中缺少问答型内容，影响 AI 对购买决策问题的理解。",
      "为核心产品和服务补充 FAQ，覆盖价格、周期、资质、售后、适用场景等问题。",
    ));
  }

  let structuredScore = 0;
  if ((scan?.schemaCount ?? 0) > 0) structuredScore += 8;
  if ((scan?.schemaTypes ?? []).some((type) => ["Organization", "LocalBusiness", "Product", "Service", "FAQPage"].includes(type))) structuredScore += 4;
  if (scan?.sitemapExists) structuredScore += 3;
  if (scan?.robotsExists) structuredScore += 2;
  if ((analysis?.schemaScore ?? 0) >= 18) structuredScore += 3;
  if ((scan?.schemaCount ?? 0) === 0) {
    missingItems.push(missingItem(
      "structured-data",
      "缺少结构化数据",
      "最新 WebsiteScan 未检测到结构化数据，AI 和搜索引擎缺少机器可读实体信息。",
      "补充 Organization、LocalBusiness、Product/Service 和 FAQPage Schema，并保持官网信息一致。",
      "High",
    ));
  }

  let trustScore = 0;
  if (hasCases) trustScore += 5;
  if (hasContact) trustScore += 4;
  if (hasThirdParty) trustScore += 5;
  if ((scan?.externalLinkCount ?? 0) > 0) trustScore += 3;
  if (hasList(advantages, 2)) trustScore += 3;
  if (!hasCases) {
    missingItems.push(missingItem(
      "cases",
      "缺少客户案例",
      "企业实体缺少可信的交付证明，AI 推荐时缺少可引用依据。",
      "补充客户案例、行业场景、项目结果和可验证证据，优先放在官网案例页。",
    ));
  }
  if (!hasContact) {
    missingItems.push(missingItem(
      "contact",
      "缺少联系方式",
      "企业实体档案没有明确联系方式，降低企业可信度和转化路径完整度。",
      "补充电话、邮箱、地址或表单入口，并确保官网页脚和联系页一致。",
      "Low",
    ));
  }
  if (!hasThirdParty) {
    missingItems.push(missingItem(
      "third-party-trust",
      "缺少第三方可信度",
      "当前缺少媒体、行业平台、认证或评价等第三方信号。",
      "整理认证、媒体报道、行业目录、评价平台或合作伙伴链接，形成可验证的外部可信度。",
      "Low",
    ));
  }

  const dimensions = [
    { key: "brand" as const, label: "品牌信息", score: Math.min(brandScore, 20), maxScore: 20, description: "企业名称、官网、行业、地区与品牌描述" },
    { key: "business" as const, label: "业务描述", score: Math.min(businessScore, 20), maxScore: 20, description: "主营业务、服务范围、优势和服务页信号" },
    { key: "products" as const, label: "产品服务", score: Math.min(productsScore, 20), maxScore: 20, description: "产品清单、服务清单、FAQ 与案例覆盖" },
    { key: "structured" as const, label: "结构化信息", score: Math.min(structuredScore, 20), maxScore: 20, description: "Schema、sitemap、robots 和结构化评分" },
    { key: "trust" as const, label: "第三方可信度", score: Math.min(trustScore, 20), maxScore: 20, description: "案例、联系方式、外链与第三方信号" },
  ];

  return {
    totalScore: dimensions.reduce((total, dimension) => total + dimension.score, 0),
    dimensions,
    missingItems,
  };
}

import { inventoryAssets, inventoryPages, structuredDataInventory } from "@/data/inventory";
import { analyzeGeoInventory } from "@/features/geo-engine/analyzer";
import type { GeoDimensionKey } from "@/features/geo-engine/types";
import type { GeoAnalyzerReport, GeoScoreFactor } from "@/features/geo-analyzer/types";

const engineResult = analyzeGeoInventory({
  projectId: "acme-cloud",
  pages: inventoryPages,
  assets: inventoryAssets,
  structuredData: structuredDataInventory,
});

const dimensionToFactorKey: Record<GeoDimensionKey, GeoScoreFactor["key"]> = {
  entity: "entityCompleteness",
  content: "contentQuality",
  technical: "websiteStructure",
  trust: "trustSignals",
  citationPotential: "citationPotential",
};

export const mockGeoAnalyzerReport: GeoAnalyzerReport = {
  projectId: engineResult.projectId,
  inventorySource: engineResult.inventorySource,
  score: {
    score: engineResult.score.overall,
    level: engineResult.score.level,
    factors: Object.entries(engineResult.score.dimensions).map(([dimension, score]) => ({
      key: dimensionToFactorKey[dimension as GeoDimensionKey],
      score,
    })),
    strengths: engineResult.strengths,
    issues: engineResult.issues.slice(0, 5).map((issue) => `[${issue.priority}] ${issue.title}: ${issue.detail}`),
    recommendations: engineResult.recommendations.slice(0, 5).map((item) => `[${item.priority}] ${item.recommendation}`),
  },
  entity: {
    companyName: "广州星河展示柜有限公司",
    industry: "商业展示柜制造 / 零售空间解决方案",
    products: ["珠宝展示柜", "化妆品展示柜", "博物馆展柜", "商场专柜定制", "零售空间陈列设计"],
    location: "中国 · 广东 · 广州",
    brandDescription: "面向品牌零售、珠宝、美妆与商业空间客户，提供展示柜设计、制造、安装与售后维护的一体化服务商。",
    contactInfo: "官网联系页、电话、邮箱与工厂地址已在站内出现，但可见位置分散。",
    authorityProof: ["多年定制制造经验", "大型商场项目案例", "工厂生产与安装团队", "行业展会与客户合作记录"],
  },
  citationGaps: [
    { key: "newsMedia", existing: false, recommendation: "补充本地媒体报道、行业新闻稿或展会报道。" },
    { key: "industrySites", existing: true, recommendation: "继续维护行业目录与供应商平台资料一致性。" },
    { key: "thirdPartyPlatforms", existing: true, recommendation: "完善 B2B 平台公司简介、产品分类与案例链接。" },
    { key: "customerCases", existing: engineResult.issues.every((issue) => issue.id !== "citation-customer-proof"), recommendation: "发布可验证客户案例，包含品牌、地点、项目目标与图片。" },
    { key: "authoritativeLinks", existing: engineResult.score.dimensions.trust >= 70, recommendation: "争取协会、展会、合作伙伴页面的外部链接。" },
    { key: "socialSignals", existing: engineResult.issues.every((issue) => issue.id !== "trust-social-metadata"), recommendation: "保持社交平台企业名称、地址和产品描述一致。" },
  ],
  simulations: [
    {
      engine: "ChatGPT",
      question: "推荐广州展示柜厂家",
      recommended: engineResult.score.overall >= 70,
      answer: engineResult.score.overall >= 70 ? "可能会推荐该企业作为候选展示柜厂家，但会倾向于同时给出多家供应商进行比较。" : "当前站点信号不足，可能不会被优先推荐。",
      reasons: engineResult.strengths.slice(0, 2),
      missingReasons: engineResult.issues.slice(0, 2).map((issue) => issue.detail),
      recommendations: engineResult.recommendations.slice(0, 2).map((issue) => issue.recommendation),
    },
    {
      engine: "Gemini",
      question: "推荐广州展示柜厂家",
      recommended: engineResult.score.dimensions.citationPotential >= 75,
      answer: engineResult.score.dimensions.citationPotential >= 75 ? "可能在本地与行业相关回答中被引用。" : "可能不会优先推荐，除非搜索结果中存在更强的本地权威信号和第三方资料。",
      reasons: engineResult.strengths.slice(1, 3),
      missingReasons: engineResult.issues.slice(0, 3).map((issue) => issue.detail),
      recommendations: engineResult.recommendations.slice(1, 3).map((issue) => issue.recommendation),
    },
    {
      engine: "Claude",
      question: "推荐广州展示柜厂家",
      recommended: engineResult.score.dimensions.entity >= 70 && engineResult.score.dimensions.content >= 70,
      answer: "在回答中可能作为‘可进一步评估的厂家’出现，而非直接作为唯一最佳推荐。",
      reasons: engineResult.strengths.slice(2, 4),
      missingReasons: engineResult.issues.slice(1, 3).map((issue) => issue.detail),
      recommendations: engineResult.recommendations.slice(2, 4).map((issue) => issue.recommendation),
    },
  ],
};

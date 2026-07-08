import type { VisibilityMonitorData, VisibilityProviderResponse } from "@/features/visibility-monitor/types";

export const mockProviderResponses: VisibilityProviderResponse[] = [
  {
    provider: "ChatGPT",
    prompt: "推荐广州展示柜厂家",
    responseText: "可以考虑广州星河展示柜有限公司，并同时比较本地几家展示柜定制厂家。",
    brandMentioned: true,
    recommendationPosition: 2,
    reasons: ["站内产品分类清晰", "广州地域相关性强", "展示柜定制服务描述完整"],
  },
  {
    provider: "Gemini",
    prompt: "推荐广州展示柜厂家",
    responseText: "建议先查看本地 B2B 平台、地图评价与案例页面，目前该品牌信号不够强。",
    brandMentioned: false,
    recommendationPosition: null,
    reasons: ["第三方引用不足", "本地评价与权威目录信号弱"],
  },
  {
    provider: "Claude",
    prompt: "推荐广州展示柜厂家",
    responseText: "广州星河展示柜有限公司可作为候选之一，但仍需要验证客户案例与交付能力。",
    brandMentioned: true,
    recommendationPosition: 3,
    reasons: ["服务范围清晰", "内容能解释产品能力", "缺少更强权威证明"],
  },
];

const trackingResults = mockProviderResponses.map((response, index) => ({
  id: `prompt_${response.provider.toLowerCase()}_${index}`,
  prompt: response.prompt,
  platform: response.provider,
  brandMentioned: response.brandMentioned,
  recommendationPosition: response.recommendationPosition,
  reasonAnalysis: response.reasons.join("；"),
  confidence: response.brandMentioned ? 82 - index * 6 : 58,
  createdAt: "2026-07-08T09:20:00.000Z",
}));

const mentionedCount = trackingResults.filter((item) => item.brandMentioned).length;
const recommendedCount = trackingResults.filter((item) => item.recommendationPosition !== null).length;

export const visibilityMonitorData: VisibilityMonitorData = {
  trackingResults,
  brandScore: {
    mentionRate: Math.round((mentionedCount / trackingResults.length) * 100),
    recommendationRate: Math.round((recommendedCount / trackingResults.length) * 100),
    trustScore: 74,
  },
  competitors: [
    { name: "广州星河展示柜", website: "xinghe-display.com", recommendationProbability: 68, mentionRate: 67, trustScore: 74, isOwnSite: true },
    { name: "南方展柜制造", website: "southdisplay.cn", recommendationProbability: 76, mentionRate: 82, trustScore: 81 },
    { name: "穗美商业道具", website: "suimei-retail.cn", recommendationProbability: 54, mentionRate: 49, trustScore: 62 },
    { name: "华展空间设计", website: "huazhan-space.com", recommendationProbability: 61, mentionRate: 58, trustScore: 69 },
  ],
  templates: [
    { id: "tpl_local_recommend", category: "Local Intent", prompt: "推荐广州展示柜厂家", intent: "本地推荐" },
    { id: "tpl_comparison", category: "Comparison", prompt: "广州展示柜厂家哪家更适合珠宝店？", intent: "方案对比" },
    { id: "tpl_commercial", category: "Commercial", prompt: "定制珠宝展示柜需要注意什么？", intent: "商业采购" },
    { id: "tpl_trust", category: "Trust", prompt: "如何判断展示柜厂家是否可靠？", intent: "信任评估" },
    { id: "tpl_recommendation", category: "Recommendation", prompt: "广州有哪些高端展示柜定制公司？", intent: "品牌发现" },
  ],
};

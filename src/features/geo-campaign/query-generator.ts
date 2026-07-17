import type { GeoCampaignCreateInput, GeoCampaignQueryDraft, GeoCampaignCategory } from "./types";

type GenerationContext = GeoCampaignCreateInput & {
  projectName: string;
  projectCountry: string;
};

type CategoryCounts = Record<GeoCampaignCategory, number>;

const CATEGORY_ORDER: GeoCampaignCategory[] = ["recommendation", "solution", "procurement", "comparison", "brand", "local"];
const QUERY_ANGLES = ["价格", "案例", "交付周期", "资质", "售后", "口碑", "服务范围", "技术能力", "项目经验", "本地交付", "行业经验", "客户评价", "方案完整度", "合规能力", "长期合作", "风险控制", "品牌可信度", "响应速度", "实施团队", "成本控制"];

const CITY_NAMES = [
  "广州", "深圳", "上海", "北京", "杭州", "苏州", "南京", "天津", "成都", "重庆", "武汉", "西安", "长沙", "厦门", "青岛", "宁波", "佛山", "东莞",
];

function splitText(value: string) {
  return value
    .split(/[。！？；;,.、\n\r/|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function unique(list: string[]) {
  return Array.from(new Set(list.map((item) => item.trim()).filter(Boolean)));
}

function pickTopic(context: GenerationContext) {
  const fragments = unique([
    ...splitText(context.businessDescription),
    ...splitText(context.name),
    context.industry,
  ]);
  return fragments[0] ?? context.industry;
}

function pickMarket(context: GenerationContext) {
  const source = `${context.name} ${context.businessDescription} ${context.projectCountry}`;
  const matchedCity = CITY_NAMES.find((city) => source.includes(city));
  if (matchedCity) return matchedCity;
  if (/china|中国|大陆|内地/i.test(source)) return "全国";
  if (/global|海外|international/i.test(source)) return "海外";
  return "本地";
}

function pickAudience(targetCustomers: string) {
  const fragments = unique([targetCustomers, "企业客户", "采购方", "工厂", "品牌方"]);
  return fragments[0] ?? "企业客户";
}

function allocateCounts(total: number, weights: Record<GeoCampaignCategory, number>): CategoryCounts {
  const rawEntries = CATEGORY_ORDER.map((category) => [category, weights[category]] as const);
  const rawTotal = rawEntries.reduce((sum, [, weight]) => sum + weight, 0) || 1;
  const base = rawEntries.map(([category, weight]) => {
    const exact = (total * weight) / rawTotal;
    return { category, exact, count: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });
  let assigned = base.reduce((sum, item) => sum + item.count, 0);
  const sorted = [...base].sort((left, right) => right.remainder - left.remainder);
  for (let index = 0; assigned < total; index += 1) {
    sorted[index % sorted.length].count += 1;
    assigned += 1;
  }
  return base.reduce((acc, item) => {
    acc[item.category] = item.count;
    return acc;
  }, {} as CategoryCounts);
}

function categoryWeights(goal: string): Record<GeoCampaignCategory, number> {
  const goalText = goal.toLowerCase();
  return {
    recommendation: 5 + (goalText.includes("曝光") || goalText.includes("推荐") || goalText.includes("visibility") ? 2 : 0) + (goalText.includes("客户") || goalText.includes("lead") ? 1 : 0),
    solution: 5 + (goalText.includes("方案") || goalText.includes("solution") ? 2 : 0) + (goalText.includes("转化") || goalText.includes("conversion") ? 1 : 0),
    procurement: 5 + (goalText.includes("采购") || goalText.includes("成交") || goalText.includes("procurement") ? 2 : 0),
    comparison: 4 + (goalText.includes("竞品") || goalText.includes("对比") || goalText.includes("competitor") ? 3 : 0),
    brand: 3 + (goalText.includes("品牌") || goalText.includes("brand") ? 2 : 0),
    local: 3 + (goalText.includes("本地") || goalText.includes("地区") || goalText.includes("local") ? 2 : 0),
  };
}

function createQueryDraftsForCategory(category: GeoCampaignCategory, context: GenerationContext, count: number): GeoCampaignQueryDraft[] {
  const market = pickMarket(context);
  const topic = pickTopic(context);
  const audience = pickAudience(context.targetCustomers);
  const brand = context.name;
  const industry = context.industry || "行业";
  const business = context.businessDescription || topic;

  const locationWords = unique([market, `${market}附近`, `${market}本地`, "全国", "国内", "一线城市", "重点城市"]);
  const qualityWords = unique(["靠谱的", "专业的", "值得推荐的", "高口碑的", "有经验的", "成熟的"]);
  const comparisonWords = unique(["和竞品比", "和同行比", "和同类比", "与头部品牌相比"]);
  const solutionWords = unique(["落地方案", "实施方案", "执行路径", "优化方案", "应用方案"]);
  const procurementWords = unique(["采购", "选型", "投标", "报价", "成交", "合作"]);
  const brandQuestions = unique(["靠谱吗", "做什么业务", "有哪些案例", "口碑怎么样", "适合谁"]);

  const drafts: GeoCampaignQueryDraft[] = [];
  const seen = new Set<string>();

  const push = (query: string, intent: string, priority: GeoCampaignQueryDraft["priority"]) => {
    const normalized = query.replace(/\s+/g, " ").trim();
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    drafts.push({ query: normalized, category, intent, priority });
  };

  if (category === "recommendation") {
    for (const location of locationWords) {
      for (const quality of qualityWords) {
        push(`${location}${quality}${topic}公司有哪些？`, "推荐型曝光", "high");
        push(`${location}${quality}${industry}服务商推荐有哪些？`, "推荐型曝光", "high");
      }
      push(`${location}有哪些值得推荐的${industry}公司？`, "推荐型曝光", "high");
      push(`${location}${audience}会优先考虑哪家${industry}公司？`, "推荐型曝光", "high");
    }
  }

  if (category === "solution") {
    for (const word of solutionWords) {
      push(`${industry}有哪些${word}？`, "方案型曝光", "medium");
      push(`${topic}有哪些更适合${audience}的${word}？`, "方案型曝光", "medium");
      push(`${brand}的${word}适合什么场景？`, "方案型曝光", "medium");
      push(`工业场景下${topic}的${word}怎么做？`, "方案型曝光", "medium");
    }
  }

  if (category === "procurement") {
    for (const word of procurementWords) {
      push(`${audience}如何选择${industry}服务商？`, "采购型曝光", "high");
      push(`采购${topic}需要关注哪些${word}指标？`, "采购型曝光", "high");
      push(`找${industry}公司${word}时要看什么？`, "采购型曝光", "high");
      push(`${audience}选${industry}供应商怎么判断靠谱？`, "采购型曝光", "high");
    }
  }

  if (category === "comparison") {
    for (const compare of comparisonWords) {
      push(`${topic}${compare}有什么区别？`, "比较型曝光", "medium");
      push(`${industry}公司${compare}哪个好？`, "比较型曝光", "medium");
      push(`${brand}${compare}表现如何？`, "比较型曝光", "medium");
      push(`同类${industry}服务商${compare}怎么选？`, "比较型曝光", "medium");
    }
  }

  if (category === "brand") {
    for (const word of brandQuestions) {
      push(`${brand}${word}？`, "品牌型曝光", "low");
      push(`${brand}主要做什么？`, "品牌型曝光", "low");
      push(`${brand}有哪些${business}案例？`, "品牌型曝光", "low");
      push(`${brand}适合哪些${audience}？`, "品牌型曝光", "low");
    }
  }

  if (category === "local") {
    for (const location of locationWords) {
      push(`${location}有哪些${industry}公司？`, "地域型曝光", "high");
      push(`${location}${topic}厂家推荐`, "地域型曝光", "high");
      push(`${location}本地${industry}服务商有哪些？`, "地域型曝光", "high");
      push(`${location}附近适合${audience}的${industry}公司有哪些？`, "地域型曝光", "high");
    }
  }

  return drafts.slice(0, count);
}

export function generateGeoQueryDrafts(context: GenerationContext): GeoCampaignQueryDraft[] {
  const total = Math.max(1, Math.min(500, Math.floor(context.queryCount || 0) || 50));
  const weights = categoryWeights(context.goal);
  const categoryCounts = allocateCounts(total, weights);

  const drafts: GeoCampaignQueryDraft[] = [];
  for (const category of CATEGORY_ORDER) {
    const categoryDrafts = createQueryDraftsForCategory(category, context, categoryCounts[category]);
    drafts.push(...categoryDrafts);
  }

  const uniqueDrafts = dedupeDrafts(drafts);
  if (uniqueDrafts.length >= total) return uniqueDrafts.slice(0, total);

  const fallbackContext = { ...context, goal: `${context.goal} 追问` };
  const fallbackCounts = allocateCounts(total - uniqueDrafts.length, categoryWeights(fallbackContext.goal));
  for (const category of CATEGORY_ORDER) {
    const remaining = fallbackCounts[category];
    if (remaining <= 0) continue;
    const categoryDrafts = createQueryDraftsForCategory(category, fallbackContext, remaining);
    drafts.push(...categoryDrafts);
    if (dedupeDrafts(drafts).length >= total) break;
  }

  return expandToRequestedCount(dedupeDrafts(drafts), total);
}

function dedupeDrafts(drafts: GeoCampaignQueryDraft[]) {
  const seen = new Set<string>();
  const uniqueDrafts: GeoCampaignQueryDraft[] = [];
  for (const draft of drafts) {
    if (seen.has(draft.query)) continue;
    seen.add(draft.query);
    uniqueDrafts.push(draft);
  }
  return uniqueDrafts;
}

function expandToRequestedCount(drafts: GeoCampaignQueryDraft[], total: number) {
  if (drafts.length === 0) return drafts;
  const expanded = [...drafts];
  const seen = new Set(expanded.map((draft) => draft.query));
  for (let index = 0; expanded.length < total && index < total * QUERY_ANGLES.length; index += 1) {
    const source = drafts[index % drafts.length];
    const angle = QUERY_ANGLES[Math.floor(index / drafts.length) % QUERY_ANGLES.length];
    const base = source.query.replace(/[？?]$/, "");
    const query = `${base}，重点关注${angle}？`;
    if (seen.has(query)) continue;
    seen.add(query);
    expanded.push({ ...source, query });
  }
  return expanded.slice(0, total);
}

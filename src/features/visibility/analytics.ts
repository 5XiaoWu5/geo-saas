import type { VisibilityAnalytics, VisibilityCampaign, VisibilityCheck, VisibilityPrompt } from "@/features/visibility/types";

type PromptWithCampaign = VisibilityPrompt & {
  campaignKeyword: string;
};

function percentage(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

function average(values: number[]) {
  return values.length ? Math.round(values.reduce((total, value) => total + value, 0) / values.length) : null;
}

function averageScore(checks: VisibilityCheck[]) {
  return checks.length ? Math.round(checks.reduce((total, check) => total + check.score, 0) / checks.length) : 0;
}

function mentionPositions(checks: VisibilityCheck[]) {
  return checks
    .map((check) => check.mentionPosition)
    .filter((position): position is number => typeof position === "number" && Number.isFinite(position));
}

function toDateKey(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

export function buildVisibilityAnalytics(campaigns: VisibilityCampaign[], prompts: VisibilityPrompt[], checks: VisibilityCheck[]): VisibilityAnalytics {
  const campaignKeywordById = new Map(campaigns.map((campaign) => [campaign.id, campaign.keyword]));
  const promptsById = new Map<string, PromptWithCampaign>();

  for (const prompt of prompts) {
    promptsById.set(prompt.id, {
      ...prompt,
      campaignKeyword: campaignKeywordById.get(prompt.campaignId) ?? "关键词",
    });
  }

  const brandMentions = checks.filter((check) => check.brandMentioned).length;
  const providerNames = [...new Set(checks.map((check) => check.provider).filter(Boolean))].sort((left, right) => left.localeCompare(right));
  const trendDates = [...new Set(checks.map((check) => toDateKey(check.createdAt)))].sort();

  const promptKeys = new Set<string>();
  for (const prompt of prompts) promptKeys.add(prompt.id);
  for (const check of checks) promptKeys.add(check.promptId ?? `legacy:${check.campaignId}:${check.prompt}`);

  return {
    totalChecks: checks.length,
    brandMentions,
    brandMentionRate: percentage(brandMentions, checks.length),
    averageMentionPosition: average(mentionPositions(checks)),
    averageScore: averageScore(checks),
    providerPerformance: providerNames.map((provider) => {
      const providerChecks = checks.filter((check) => check.provider === provider);
      const providerMentions = providerChecks.filter((check) => check.brandMentioned).length;
      return {
        provider,
        totalChecks: providerChecks.length,
        brandMentions: providerMentions,
        brandMentionRate: percentage(providerMentions, providerChecks.length),
        averageMentionPosition: average(mentionPositions(providerChecks)),
        averageScore: averageScore(providerChecks),
      };
    }),
    trend: trendDates.map((date) => {
      const dateChecks = checks.filter((check) => toDateKey(check.createdAt) === date);
      const dateMentions = dateChecks.filter((check) => check.brandMentioned).length;
      return {
        date,
        totalChecks: dateChecks.length,
        brandMentions: dateMentions,
        brandMentionRate: percentage(dateMentions, dateChecks.length),
      };
    }),
    promptAnalytics: [...promptKeys].map((key) => {
      const prompt = promptsById.get(key);
      const promptChecks = prompt
        ? checks.filter((check) => check.promptId === prompt.id)
        : checks.filter((check) => `legacy:${check.campaignId}:${check.prompt}` === key);
      const promptMentions = promptChecks.filter((check) => check.brandMentioned).length;
      const firstCheck = promptChecks[0];
      const campaignId = prompt?.campaignId ?? firstCheck?.campaignId ?? "";
      return {
        promptId: prompt?.id ?? null,
        campaignId,
        campaignKeyword: prompt?.campaignKeyword ?? campaignKeywordById.get(campaignId) ?? "关键词",
        prompt: prompt?.prompt ?? firstCheck?.prompt ?? "Prompt",
        totalChecks: promptChecks.length,
        brandMentions: promptMentions,
        brandMentionRate: percentage(promptMentions, promptChecks.length),
        averageMentionPosition: average(mentionPositions(promptChecks)),
      };
    }).sort((left, right) => right.totalChecks - left.totalChecks || left.prompt.localeCompare(right.prompt)),
  };
}

export function emptyVisibilityAnalytics(): VisibilityAnalytics {
  return buildVisibilityAnalytics([], [], []);
}

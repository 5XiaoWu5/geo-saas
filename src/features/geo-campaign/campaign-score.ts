import type { VisibilityAnalytics, VisibilityPrompt, VisibilityTrendPoint } from "@/features/visibility/types";
import type { GeoCampaign, GeoCampaignScore, GeoQuery } from "./types";

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function positionScore(position: number | null) {
  if (!position) return 0;
  if (position <= 1) return 100;
  if (position <= 3) return 85;
  if (position <= 5) return 70;
  if (position <= 10) return 50;
  return 30;
}

function trendDelta(trend: VisibilityTrendPoint[]) {
  if (trend.length < 2) return 0;
  const latest = trend[trend.length - 1]?.brandMentionRate ?? 0;
  const previous = trend[trend.length - 2]?.brandMentionRate ?? 0;
  return latest - previous;
}

export function buildCampaignScore(
  campaign: GeoCampaign,
  queries: GeoQuery[],
  prompts: VisibilityPrompt[],
  analytics: VisibilityAnalytics,
): GeoCampaignScore {
  const requestedQueries = Math.max(campaign.queryCount, queries.length, 1);
  const queryCoverage = clamp((queries.length / requestedQueries) * 100);
  const monitoringCoverage = clamp((prompts.length / requestedQueries) * 100);
  const rankingScore = positionScore(analytics.averageMentionPosition);
  const signalScore = analytics.totalChecks > 0 ? Math.min(100, analytics.totalChecks * 8) : 0;
  const score = clamp(
    queryCoverage * 0.25
    + monitoringCoverage * 0.2
    + analytics.brandMentionRate * 0.35
    + rankingScore * 0.15
    + signalScore * 0.05,
  );

  return {
    score,
    queryCoverage,
    visibilityRate: analytics.brandMentionRate,
    averageMentionPosition: analytics.averageMentionPosition,
    brandMentions: analytics.brandMentions,
    totalChecks: analytics.totalChecks,
    monitoringCoverage,
    trendDelta: trendDelta(analytics.trend),
  };
}

export function buildCampaignSummary(campaigns: Array<GeoCampaign & { score: GeoCampaignScore }>, analytics: VisibilityAnalytics) {
  const totalQueries = campaigns.reduce((sum, campaign) => sum + campaign.queryCount, 0);
  const queryCoverage = campaigns.length
    ? clamp(campaigns.reduce((sum, campaign) => sum + campaign.score.queryCoverage, 0) / campaigns.length)
    : 0;
  const growthDelta = trendDelta(analytics.trend);

  return {
    totalCampaigns: campaigns.length,
    totalQueries,
    totalChecks: analytics.totalChecks,
    brandMentions: analytics.brandMentions,
    aiExposureRate: analytics.brandMentionRate,
    averageMentionPosition: analytics.averageMentionPosition,
    averageScore: analytics.averageScore,
    queryCoverage,
    growthDelta,
  };
}


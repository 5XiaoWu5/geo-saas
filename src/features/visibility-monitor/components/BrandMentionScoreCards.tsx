"use client";

import type { BrandMentionScore } from "@/features/visibility-monitor/types";
import { useI18n } from "@/i18n/provider";
import { MetricCard } from "@/components/shared/page";

export function BrandMentionScoreCards({ score }: { score: BrandMentionScore }) {
  const { t } = useI18n();

  return (
    <section className="grid gap-4 md:grid-cols-3">
      <MetricCard label={t("visibility.mentionRate")} value={`${score.mentionRate}%`} delta={t("common.mockData")} />
      <MetricCard label={t("visibility.recommendationRate")} value={`${score.recommendationRate}%`} delta={t("common.mockData")} />
      <MetricCard label={t("visibility.trustScore")} value={`${score.trustScore}%`} delta={t("common.mockData")} />
    </section>
  );
}

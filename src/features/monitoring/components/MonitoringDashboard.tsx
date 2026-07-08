"use client";

import { monitoringSnapshot } from "@/features/monitoring/data/mock-history";
import { useI18n } from "@/i18n/provider";
import { MetricCard, PageHeader } from "@/components/shared/page";
import { AIMentionTrend } from "@/features/monitoring/components/AIMentionTrend";
import { GeoScoreTrend } from "@/features/monitoring/components/GeoScoreTrend";
import { OptimizationChangeList } from "@/features/monitoring/components/OptimizationChangeList";
import { IssueTrendCard } from "@/features/monitoring/components/IssueTrendCard";

export function MonitoringDashboard() {
  const { t } = useI18n();
  const latestGeo = monitoringSnapshot.geoHistory.at(-1);
  const firstGeo = monitoringSnapshot.geoHistory[0];
  const mentioned = monitoringSnapshot.visibilityHistory.filter((item) => item.mentioned).length;
  const mentionRate = Math.round((mentioned / monitoringSnapshot.visibilityHistory.length) * 100);
  const lift = latestGeo && firstGeo ? latestGeo.geoScore - firstGeo.geoScore : 0;

  return (
    <div className="space-y-6">
      <PageHeader title={t("monitoring.title")} description={t("monitoring.description")} />
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label={t("monitoring.currentGeoScore")} value={String(latestGeo?.geoScore ?? 0)} delta={t("common.latest")} />
        <MetricCard label={t("monitoring.aiMentionRate")} value={`${mentionRate}%`} delta={t("monitoring.visibilityHistory")} />
        <MetricCard label={t("monitoring.optimizationLift")} value={`+${lift}`} delta={t("monitoring.beforeAfter")} />
      </section>
      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <GeoScoreTrend history={monitoringSnapshot.geoHistory} title={t("monitoring.geoScoreTrend")} />
        <AIMentionTrend history={monitoringSnapshot.visibilityHistory} title={t("monitoring.aiMentionTrend")} mentionedLabel={t("monitoring.mentioned")} missingLabel={t("monitoring.notMentioned")} />
      </section>
      <IssueTrendCard trends={monitoringSnapshot.issueTrends} />
      <OptimizationChangeList changes={monitoringSnapshot.optimizationChanges} title={t("monitoring.beforeAfter")} />
    </div>
  );
}


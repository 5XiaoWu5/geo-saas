"use client";

import { useEffect, useState } from "react";
import { ProjectLoadingSkeleton } from "@/features/project-center/components/ProjectStates";
import { useProject } from "@/features/project-center/context/ProjectContext";
import { getMonitoringData } from "@/features/project-center/services/project.service";
import type { MonitoringSnapshot } from "@/features/monitoring/types";
import { useI18n } from "@/i18n/provider";
import { MetricCard, PageHeader } from "@/components/shared/page";
import { AIMentionTrend } from "@/features/monitoring/components/AIMentionTrend";
import { GeoScoreTrend } from "@/features/monitoring/components/GeoScoreTrend";
import { OptimizationChangeList } from "@/features/monitoring/components/OptimizationChangeList";
import { IssueTrendCard } from "@/features/monitoring/components/IssueTrendCard";

export function ProjectMonitoringTab() {
  const { projectId } = useProject();
  const { t } = useI18n();
  const [data, setData] = useState<MonitoringSnapshot | null>(null);

  useEffect(() => {
    void getMonitoringData(projectId).then(setData);
  }, [projectId]);

  if (!data) return <ProjectLoadingSkeleton />;

  const latestGeo = data.geoHistory.at(-1);
  const firstGeo = data.geoHistory[0];
  const mentioned = data.visibilityHistory.filter((item) => item.mentioned).length;
  const mentionRate = Math.round((mentioned / data.visibilityHistory.length) * 100);
  const lift = latestGeo && firstGeo ? latestGeo.geoScore - firstGeo.geoScore : 0;

  return (
    <div className="space-y-6">
      <PageHeader title={t("monitoring.title")} description={t("monitoring.description")} />
      <section className="grid gap-4 md:grid-cols-3"><MetricCard label={t("monitoring.currentGeoScore")} value={String(latestGeo?.geoScore ?? 0)} delta={t("common.latest")} /><MetricCard label={t("monitoring.aiMentionRate")} value={`${mentionRate}%`} delta={t("monitoring.visibilityHistory")} /><MetricCard label={t("monitoring.optimizationLift")} value={`+${lift}`} delta={t("monitoring.beforeAfter")} /></section>
      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]"><GeoScoreTrend history={data.geoHistory} title={t("monitoring.geoScoreTrend")} /><AIMentionTrend history={data.visibilityHistory} title={t("monitoring.aiMentionTrend")} mentionedLabel={t("monitoring.mentioned")} missingLabel={t("monitoring.notMentioned")} /></section>
      <IssueTrendCard trends={data.issueTrends} />
      <OptimizationChangeList changes={data.optimizationChanges} title={t("monitoring.beforeAfter")} />
    </div>
  );
}



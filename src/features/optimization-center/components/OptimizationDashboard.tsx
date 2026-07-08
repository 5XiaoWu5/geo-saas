"use client";

import type { OptimizationDashboardStats } from "@/features/optimization-center/types";
import { useI18n } from "@/i18n/provider";
import { MetricCard } from "@/components/shared/page";

export function OptimizationDashboard({ stats }: { stats: OptimizationDashboardStats }) {
  const { t } = useI18n();

  return (
    <section className="grid gap-4 md:grid-cols-3">
      <MetricCard label={t("optimization.todoTasks")} value={String(stats.todoTasks)} delta={t("optimization.dashboard")} />
      <MetricCard label={t("optimization.doneTasks")} value={String(stats.doneTasks)} delta={t("optimization.dashboard")} />
      <MetricCard label={t("optimization.predictedLift")} value={`+${stats.predictedGeoLift}`} delta={t("optimization.estimatedLift")} />
    </section>
  );
}

"use client";

import type { GeoAnalyzerReport } from "@/features/geo-analyzer/types";
import { buildOptimizationCenterData } from "@/features/optimization-center/data/generator";
import type { VisibilityMonitorData } from "@/features/visibility-monitor/types";
import { useI18n } from "@/i18n/provider";
import { PageHeader } from "@/components/shared/page";
import { ContentGeneratorPanel } from "@/features/optimization-center/components/ContentGeneratorPanel";
import { OptimizationDashboard } from "@/features/optimization-center/components/OptimizationDashboard";
import { OptimizationTaskList } from "@/features/optimization-center/components/OptimizationTaskList";
import { SchemaGeneratorPanel } from "@/features/optimization-center/components/SchemaGeneratorPanel";

export function OptimizationCenter({ report, visibility }: { report: GeoAnalyzerReport; visibility: VisibilityMonitorData }) {
  const { t } = useI18n();
  const data = buildOptimizationCenterData(report, visibility);

  return (
    <section className="space-y-6">
      <PageHeader title={t("optimization.title")} description={t("optimization.description")} />
      <OptimizationDashboard stats={data.stats} />
      <OptimizationTaskList tasks={data.tasks} />
      <ContentGeneratorPanel items={data.generatedContent} />
      <SchemaGeneratorPanel schemas={data.generatedSchemas} />
    </section>
  );
}

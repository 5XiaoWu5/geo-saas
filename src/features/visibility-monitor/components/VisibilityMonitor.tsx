"use client";

import { visibilityMonitorData } from "@/features/visibility-monitor/data/mock-visibility";
import { useI18n } from "@/i18n/provider";
import { PageHeader } from "@/components/shared/page";
import { BrandMentionScoreCards } from "@/features/visibility-monitor/components/BrandMentionScoreCards";
import { CompetitorCompare } from "@/features/visibility-monitor/components/CompetitorCompare";
import { PromptTemplateLibrary } from "@/features/visibility-monitor/components/PromptTemplateLibrary";
import { PromptTrackingTable } from "@/features/visibility-monitor/components/PromptTrackingTable";

export function VisibilityMonitor() {
  const { t } = useI18n();

  return (
    <section className="space-y-6">
      <PageHeader title={t("visibility.title")} description={t("visibility.description")} />
      <BrandMentionScoreCards score={visibilityMonitorData.brandScore} />
      <PromptTrackingTable results={visibilityMonitorData.trackingResults} />
      <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <CompetitorCompare competitors={visibilityMonitorData.competitors} />
        <PromptTemplateLibrary templates={visibilityMonitorData.templates} />
      </section>
    </section>
  );
}

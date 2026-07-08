"use client";

import { useEffect, useState } from "react";
import { BrandMentionScoreCards } from "@/features/visibility-monitor/components/BrandMentionScoreCards";
import { CompetitorCompare } from "@/features/visibility-monitor/components/CompetitorCompare";
import { PromptTemplateLibrary } from "@/features/visibility-monitor/components/PromptTemplateLibrary";
import { PromptTrackingTable } from "@/features/visibility-monitor/components/PromptTrackingTable";
import type { VisibilityMonitorData } from "@/features/visibility-monitor/types";
import { ProjectLoadingSkeleton } from "@/features/project-center/components/ProjectStates";
import { useProject } from "@/features/project-center/context/ProjectContext";
import { getVisibilityData } from "@/features/project-center/services/project.service";
import { useI18n } from "@/i18n/provider";
import { PageHeader } from "@/components/shared/page";

export function ProjectVisibilityTab() {
  const { projectId } = useProject();
  const { t } = useI18n();
  const [data, setData] = useState<VisibilityMonitorData | null>(null);

  useEffect(() => {
    void getVisibilityData(projectId).then(setData);
  }, [projectId]);

  if (!data) return <ProjectLoadingSkeleton />;

  return <section className="space-y-6"><PageHeader title={t("visibility.title")} description={t("visibility.description")} /><BrandMentionScoreCards score={data.brandScore} /><PromptTrackingTable results={data.trackingResults} /><section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]"><CompetitorCompare competitors={data.competitors} /><PromptTemplateLibrary templates={data.templates} /></section></section>;
}


"use client";

import { useEffect, useState } from "react";
import type { GeoAnalyzerReport } from "@/features/geo-analyzer/types";
import { OptimizationCenter } from "@/features/optimization-center";
import type { VisibilityMonitorData } from "@/features/visibility-monitor/types";
import { ProjectLoadingSkeleton } from "@/features/project-center/components/ProjectStates";
import { useProject } from "@/features/project-center/context/ProjectContext";
import { getAnalyzerResult, getVisibilityData } from "@/features/project-center/services/project.service";

export function ProjectOptimizationTab() {
  const { projectId } = useProject();
  const [report, setReport] = useState<GeoAnalyzerReport | null>(null);
  const [visibility, setVisibility] = useState<VisibilityMonitorData | null>(null);

  useEffect(() => {
    void Promise.all([getAnalyzerResult(projectId), getVisibilityData(projectId)]).then(([nextReport, nextVisibility]) => {
      setReport(nextReport);
      setVisibility(nextVisibility);
    });
  }, [projectId]);

  if (!report || !visibility) return <ProjectLoadingSkeleton />;

  return <OptimizationCenter report={report} visibility={visibility} />;
}


import type { GeoAnalysis } from "@/features/geo-analysis/types";
import type { WebsiteScan } from "@/features/website-crawl/types";
import type { Project } from "@/types/project";
import type { SimulationRecord } from "@/features/ai-search-simulator/types";
import type { GrowthTrend } from "@/features/growth/types";

export type ProjectReport = {
  projectId: string;
  projectName: string;
  websiteUrl: string;
  project: Project;
  scan: WebsiteScan | null;
  analysis: GeoAnalysis | null;
  latestSimulation: SimulationRecord | null;
  growthTrend: GrowthTrend;
  optimization: {
    totalTasks: number;
    completedTasks: number;
    incompleteTasks: number;
  };
};

export type ReportsResponse = {
  totalProjects: number;
  reportCount: number;
  reports: ProjectReport[];
  error?: string;
};

import type { AIPlatform } from "@/features/visibility-monitor/types";

export type GeoScoreHistoryPoint = {
  id: string;
  projectId: string;
  recordedAt: string;
  geoScore: number;
  entityScore: number;
  contentScore: number;
  trustScore: number;
  technicalScore: number;
};

export type AIVisibilityHistoryPoint = {
  id: string;
  projectId: string;
  recordedAt: string;
  prompt: string;
  platform: AIPlatform;
  mentioned: boolean;
  rankingPosition: number | null;
};

export type OptimizationChangePoint = {
  id: string;
  projectId: string;
  label: string;
  beforeScore: number;
  afterScore: number;
  changedAt: string;
};

export type IssueTrend = {
  id: string;
  projectId: string;
  date: string;
  openIssues: number;
  fixedIssues: number;
  newIssues: number;
  regressionIssues: number;
};

export type MonitoringSnapshot = {
  geoHistory: GeoScoreHistoryPoint[];
  visibilityHistory: AIVisibilityHistoryPoint[];
  optimizationChanges: OptimizationChangePoint[];
  issueTrends: IssueTrend[];
};

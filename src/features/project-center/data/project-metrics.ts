export type ProjectMetrics = {
  geoScore: number;
  citationScore: number;
  entityScore: number;
  schemaScore: number;
  contentScore: number;
  visibilityScore: number;
  optimizationProgress: number;
  todoTasks: number;
  overallHealth: number;
  healthTrend: Array<{ date: string; score: number }>;
};

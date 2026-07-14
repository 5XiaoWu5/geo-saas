export type GeoIssueCategory = "entity" | "schema" | "technical" | "content";

export type GeoIssueSeverity = "critical" | "warning" | "suggestion";

export type GeoIssue = {
  category: GeoIssueCategory;
  severity: GeoIssueSeverity;
  title: string;
  description: string;
};

export type GeoAnalysis = {
  id: string;
  projectId: string;
  scanId: string;
  totalScore: number;
  entityScore: number;
  schemaScore: number;
  technicalScore: number;
  contentScore: number;
  issues: GeoIssue[];
  createdAt: string;
};

export type GeoAnalysisResult = Omit<GeoAnalysis, "id" | "projectId" | "scanId" | "createdAt">;

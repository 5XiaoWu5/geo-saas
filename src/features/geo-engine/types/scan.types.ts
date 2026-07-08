import type { WebsiteEntity } from "@/features/geo-engine/entity/types/entity.types";

export type GeoScanStatus = "pending" | "running" | "completed" | "failed";

export type GeoScan = {
  id: string;
  workspaceId: string;
  projectId: string;
  url: string;
  status: GeoScanStatus;
  progress: number;
  totalPages: number;
  completedPages: number;
  currentPage: string | null;
  startedAt: string | null;
  completedAt: string | null;
};

export type RawHtmlSnapshot = {
  url: string;
  html: string;
  headers: Record<string, string>;
};

export type NormalizedPageSnapshot = {
  url: string;
  title: string;
  description: string;
  headings: string[];
  content: string;
  links: Array<{ href: string; label: string; internal: boolean }>;
  schema: Array<{ type: string; valid: boolean }>;
  entities: string[];
};

export type PageSnapshot = NormalizedPageSnapshot;

export type PageGEOScore = {
  url: string;
  title: string;
  contentScore: number;
  schemaScore: number;
  entityScore: number;
  citationPotential: number;
  aiReadabilityScore: number;
  overallScore: number;
};

export type WebsiteGEOResult = {
  scanId: string;
  overallScore: number;
  pageScores: PageGEOScore[];
  contentScore: number;
  schemaScore: number;
  entityScore: number;
  entities: WebsiteEntity[];
  citationPotential: number;
  aiReadabilityScore: number;
  issues: string[];
  recommendations: string[];
};

export type GEOAnalysisResult = WebsiteGEOResult & {
  page: NormalizedPageSnapshot;
};

export type GeoScanResult = {
  scan: GeoScan;
  analysis: GEOAnalysisResult;
};

export type ScanProgress = {
  status: GeoScanStatus;
  percentage: number;
  currentPage: string | null;
  completedPages: number;
  totalPages: number;
};




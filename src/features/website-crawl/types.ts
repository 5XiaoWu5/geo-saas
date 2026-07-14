export type WebsiteScanStatus = "completed" | "failed";

export type WebsiteScan = {
  id: string;
  projectId: string;
  url: string;
  status: WebsiteScanStatus;
  title: string | null;
  description: string | null;
  h1Count: number;
  h2Count: number;
  internalLinkCount: number;
  externalLinkCount: number;
  schemaCount: number;
  schemaTypes: string[];
  robotsExists: boolean;
  sitemapExists: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CrawlStatus = "Waiting" | "Running" | "Completed" | "Failed";

export type CrawlJob = {
  id: string;
  websiteUrl: string;
  status: CrawlStatus;
  progress: number;
  currentPage: string;
  pagesFound: number;
  assetsFound: number;
  images: number;
  internalLinks: number;
  externalLinks: number;
  startedAt: string;
  completedAt: string | null;
};

export type CrawlPageResult = {
  id: string;
  url: string;
  title: string;
  metaDescription: string;
  h1: string;
  language: string;
  statusCode: 200 | 301 | 302 | 404 | 500;
  wordCount: number;
  canonical: string;
  indexable: boolean;
  depth: number;
};

export type CrawlResultSortKey = "title" | "statusCode" | "wordCount" | "depth" | "indexable";

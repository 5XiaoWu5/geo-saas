export type CrawlStatus = "Waiting" | "Running" | "Completed" | "Failed";

export type CrawlJob = {
  id: string;
  websiteUrl: string;
  status: CrawlStatus;
  progress: number | null;
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
  language: string | null;
  statusCode: number | null;
  wordCount: number | null;
  canonical: string | null;
  indexable: boolean | null;
  depth: number | null;
};

export type CrawlResultSortKey = "title" | "statusCode" | "wordCount" | "depth" | "indexable";

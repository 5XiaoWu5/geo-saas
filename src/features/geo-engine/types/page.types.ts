export type CrawledPageStatus = "queued" | "crawling" | "completed" | "failed";

export type CrawledPage = {
  id: string;
  scanId: string;
  url: string;
  title: string;
  content: string;
  html: string;
  status: CrawledPageStatus;
  createdAt: string;
};

import type { CrawlJob, CrawlPageResult } from "@/types/crawl";

export const mockCrawlJobs: CrawlJob[] = [];
export const mockCrawlResults: CrawlPageResult[] = [];

export const crawlDashboardStats = {
  totalCrawledPages: 0,
  lastCrawlTime: null,
  pagesIndexed: 0,
};

export function createMockCrawlJob(websiteUrl: string): CrawlJob {
  const now = new Date().toISOString();
  return {
    id: `crawl_${Date.now()}`,
    websiteUrl,
    status: "Waiting",
    progress: 0,
    currentPage: websiteUrl,
    pagesFound: 0,
    assetsFound: 0,
    images: 0,
    internalLinks: 0,
    externalLinks: 0,
    startedAt: now,
    completedAt: null,
  };
}

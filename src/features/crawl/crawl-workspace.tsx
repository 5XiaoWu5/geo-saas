"use client";

import { useMemo, useState } from "react";
import type { CrawlJob } from "@/types/crawl";
import { createMockCrawlJob, mockCrawlJobs, mockCrawlResults } from "@/data/crawl";
import { useI18n } from "@/i18n/provider";
import { PageHeader } from "@/components/shared/page";
import { CrawlProgress } from "@/features/crawl/crawl-progress";
import { CrawlQueue } from "@/features/crawl/crawl-queue";
import { CrawlResultsTable } from "@/features/crawl/crawl-results-table";
import { CrawlStartForm } from "@/features/crawl/crawl-start-form";

export function CrawlWorkspace() {
  const { t } = useI18n();
  const [jobs, setJobs] = useState<CrawlJob[]>(mockCrawlJobs);
  const [selectedJobId, setSelectedJobId] = useState(mockCrawlJobs[2]?.id ?? mockCrawlJobs[0].id);

  const selectedJob = useMemo(() => jobs.find((job) => job.id === selectedJobId) ?? jobs[0], [jobs, selectedJobId]);

  function handleStart(websiteUrl: string) {
    const nextJob = createMockCrawlJob(websiteUrl);
    setJobs((currentJobs) => [nextJob, ...currentJobs]);
    setSelectedJobId(nextJob.id);
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("crawl.title")} description={t("crawl.description")} />
      <CrawlStartForm onStart={handleStart} />
      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <CrawlQueue jobs={jobs} selectedJobId={selectedJob.id} onSelectJob={(job) => setSelectedJobId(job.id)} />
        <CrawlProgress job={selectedJob} />
      </section>
      {selectedJob.status === "Completed" ? <CrawlResultsTable pages={mockCrawlResults} /> : null}
    </div>
  );
}

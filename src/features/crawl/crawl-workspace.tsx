"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import type { CrawlJob, CrawlPageResult } from "@/types/crawl";
import type { WebsiteScan } from "@/features/website-crawl/types";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page";
import { CrawlProgress } from "@/features/crawl/crawl-progress";
import { CrawlQueue } from "@/features/crawl/crawl-queue";
import { CrawlResultsTable } from "@/features/crawl/crawl-results-table";
import { CrawlStartForm } from "@/features/crawl/crawl-start-form";

function toCrawlJob(scan: WebsiteScan): CrawlJob {
  return {
    id: scan.id,
    websiteUrl: scan.url,
    status: scan.status === "completed" ? "Completed" : "Failed",
    progress: scan.status === "completed" ? 100 : 100,
    currentPage: scan.url,
    pagesFound: scan.status === "completed" ? 1 : 0,
    assetsFound: scan.schemaCount,
    images: 0,
    internalLinks: scan.internalLinkCount,
    externalLinks: scan.externalLinkCount,
    startedAt: scan.createdAt,
    completedAt: scan.updatedAt,
  };
}

function toCrawlResult(scan: WebsiteScan): CrawlPageResult {
  return {
    id: scan.id,
    url: scan.url,
    title: scan.title ?? "???????",
    metaDescription: scan.description ?? "???????",
    h1: `H1 ???${scan.h1Count}`,
    language: "zh",
    statusCode: scan.status === "completed" ? 200 : 500,
    wordCount: 0,
    canonical: scan.url,
    indexable: scan.status === "completed",
    depth: 0,
  };
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  const data = text ? JSON.parse(text) as T & { error?: string } : {} as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "????");
  return data;
}

export function CrawlWorkspace() {
  const { t } = useI18n();
  const [scans, setScans] = useState<WebsiteScan[]>([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const jobs = useMemo(() => scans.map(toCrawlJob), [scans]);
  const selectedJob = useMemo(() => jobs.find((job) => job.id === selectedJobId) ?? jobs[0] ?? null, [jobs, selectedJobId]);
  const selectedScan = useMemo(() => scans.find((scan) => scan.id === selectedJob?.id) ?? null, [scans, selectedJob]);

  async function loadScans() {
    setLoading(true);
    setError("");
    try {
      const data = await readJson<{ scans: WebsiteScan[] }>(await fetch("/api/crawl", { cache: "no-store" }));
      setScans(data.scans);
      setSelectedJobId((current) => current && data.scans.some((scan) => scan.id === current) ? current : data.scans[0]?.id ?? "");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "????????");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadScans();
  }, []);

  function handleStart(websiteUrl: string) {
    void websiteUrl;
    setNotice("??????????????????????????????????");
  }

  async function handleCleanTestScans() {
    setCleaning(true);
    setNotice("");
    setError("");
    try {
      const data = await readJson<{ deleted: number }>(await fetch("/api/crawl", { method: "DELETE" }));
      setNotice(`??? ${data.deleted} ????????`);
      await loadScans();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "??????????");
    } finally {
      setCleaning(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("crawl.title")} description="???????????????????????????????????" action={<Button variant="outline" onClick={() => void handleCleanTestScans()} disabled={cleaning}><Trash2 className="h-4 w-4" /> {cleaning ? "????..." : "????????"}</Button>} />
      <CrawlStartForm onStart={handleStart} />
      {notice ? <div className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">{notice}</div> : null}
      {error ? <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}
      {loading ? <Card className="glass-panel border-white/10"><CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> ??????????...</CardContent></Card> : null}
      {!loading && !selectedJob ? <Card className="glass-panel border-white/10"><CardContent className="p-6 text-sm text-muted-foreground">????????????????????????????</CardContent></Card> : null}
      {!loading && selectedJob ? (
        <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <CrawlQueue jobs={jobs} selectedJobId={selectedJob.id} onSelectJob={(job) => setSelectedJobId(job.id)} />
          <CrawlProgress job={selectedJob} />
        </section>
      ) : null}
      {selectedScan && selectedScan.status === "completed" ? <CrawlResultsTable pages={[toCrawlResult(selectedScan)]} /> : null}
    </div>
  );
}

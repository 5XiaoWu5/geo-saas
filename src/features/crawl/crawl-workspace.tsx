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
    progress: 100,
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
    title: scan.title ?? "未发现页面标题",
    metaDescription: scan.description ?? "未发现页面描述",
    h1: `H1 数量：${scan.h1Count}`,
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
  if (!response.ok) throw new Error(data.error ?? "请求失败");
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
      setError(requestError instanceof Error ? requestError.message : "扫描记录加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadScans();
  }, []);

  function handleStart(websiteUrl: string) {
    void websiteUrl;
    setNotice("请进入对应项目详情页点击“开始分析”，系统会生成真实数据库扫描记录。");
  }

  async function handleCleanTestScans() {
    setCleaning(true);
    setNotice("");
    setError("");
    try {
      const data = await readJson<{ deleted: number }>(await fetch("/api/crawl", { method: "DELETE" }));
      setNotice(`已清理 ${data.deleted} 条测试扫描记录。`);
      await loadScans();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "测试扫描记录清理失败");
    } finally {
      setCleaning(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("crawl.title")} description="展示当前账号真实项目扫描记录；开发测试域名数据已从页面默认数据中移除。" action={<Button variant="outline" onClick={() => void handleCleanTestScans()} disabled={cleaning}><Trash2 className="h-4 w-4" /> {cleaning ? "正在清理..." : "清理测试扫描记录"}</Button>} />
      <CrawlStartForm onStart={handleStart} />
      {notice ? <div className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">{notice}</div> : null}
      {error ? <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}
      {loading ? <Card className="glass-panel border-white/10"><CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> 正在加载真实扫描记录...</CardContent></Card> : null}
      {!loading && !selectedJob ? <Card className="glass-panel border-white/10"><CardContent className="p-6 text-sm text-muted-foreground">暂无真实扫描记录。请先在项目详情页运行一次“开始分析”。</CardContent></Card> : null}
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

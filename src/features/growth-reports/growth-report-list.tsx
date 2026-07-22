"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, FileClock, Loader2, Plus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { GrowthReportListItem } from "./types";

function displayDate(value: string) { return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
function displayStatus(value: GrowthReportListItem["status"]) { return value === "COMPLETED" ? "已完成" : value === "FAILED" ? "生成失败" : "生成中"; }

export function GrowthReportList({ projectId }: { projectId: string }) {
  const [reports, setReports] = useState<GrowthReportListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/reports`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      setReports(((await response.json()) as { reports: GrowthReportListItem[] }).reports);
      setError(null);
    } catch { setError("暂时无法读取历史报告，请稍后重试。"); } finally { setLoading(false); }
  }, [projectId]);
  useEffect(() => { void load(); }, [load]);
  async function generate() {
    setGenerating(true); setError(null);
    try { const response = await fetch(`/api/projects/${projectId}/reports`, { method: "POST" }); if (!response.ok) throw new Error(); await load(); }
    catch { setError("报告生成失败；系统没有写入虚假结果，请检查数据或稍后重试。"); }
    finally { setGenerating(false); }
  }
  return <div className="min-w-0 space-y-6 overflow-x-hidden" data-testid="growth-report-list">
    <section className="overflow-hidden rounded-3xl border border-cyan-400/20 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.16),transparent_42%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] p-5 sm:p-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div className="max-w-3xl space-y-3"><div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-100"><ShieldCheck className="h-4 w-4" />不可变历史事实层</div><h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">企业 AI 增长报告</h1><p className="text-sm leading-6 text-slate-300 sm:text-base">将 SEO、GEO、AI 搜索、知识资产、竞品与优化路线固化为可追溯快照。新数据只会生成新版本，不会改写旧报告。</p></div><Button onClick={generate} disabled={generating} className="min-h-11 w-full gap-2 sm:w-auto">{generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}{generating ? "正在生成" : "生成新报告"}</Button></div>
    </section>
    {error ? <div role="alert" className="rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-100">{error}</div> : null}
    <section className="space-y-3"><div><h2 className="text-xl font-semibold">历史报告</h2><p className="mt-1 text-sm text-muted-foreground">所有完成版本只读保存，最多展示最近 200 份。</p></div>
      {loading ? <Card><CardContent className="flex min-h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></CardContent></Card> : reports.length === 0 ? <Card><CardContent className="flex min-h-40 flex-col items-center justify-center gap-3 text-center"><FileClock className="h-8 w-8 text-muted-foreground" /><p className="text-sm text-muted-foreground">尚未生成报告。即使当前暂无数据，也可以生成一份明确标记 unavailable 的基线报告。</p></CardContent></Card> : <div className="grid gap-3 lg:grid-cols-2">{reports.map((report) => <Card key={report.id} className="min-w-0 border-white/10 bg-card/70"><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle>Report v{report.version}</CardTitle><CardDescription className="mt-1">{displayDate(report.createdAt)}</CardDescription></div><span className="rounded-full border border-white/10 px-2.5 py-1 text-xs">{displayStatus(report.status)}</span></div></CardHeader><CardContent className="space-y-4"><div className="grid gap-2 text-xs text-muted-foreground"><span className="break-all">数据版本：{report.dataVersion}</span><span>方法版本：{report.methodVersion}</span><span>证据覆盖：{report.confidence === null ? "unavailable" : `${report.confidence}%`}</span></div><Button asChild variant="outline" className="min-h-11 w-full justify-between"><Link href={`/projects/${projectId}/reports/${report.id}`}>查看只读详情<ArrowRight className="h-4 w-4" /></Link></Button></CardContent></Card>)}</div>}
    </section>
  </div>;
}

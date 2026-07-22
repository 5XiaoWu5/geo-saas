"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, History, Loader2, Search } from "lucide-react";
import { PageHeader } from "@/components/shared/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PROVIDER_LABELS, type AISearchProviderType } from "@/features/real-ai-search/types";
import type { MonitoringHistoryResponse, MonitoringHistoryStatus } from "./types";

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  const body = text ? JSON.parse(text) as T & { error?: string } : {} as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? "请求失败");
  return body;
}

export function MonitoringHistoryWorkspace({ projectId }: { projectId: string }) {
  const [data, setData] = useState<MonitoringHistoryResponse | null>(null);
  const [page, setPage] = useState(1);
  const [provider, setProvider] = useState<"" | AISearchProviderType>("");
  const [status, setStatus] = useState<"" | MonitoringHistoryStatus>("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), pageSize: "10" });
    if (provider) params.set("provider", provider);
    if (status) params.set("status", status);
    if (query) params.set("search", query);
    setLoading(true);
    try {
      setData(await readJson<MonitoringHistoryResponse>(await fetch(`/api/ai-search-monitoring/${projectId}/history?${params}`, { cache: "no-store" })));
      setError("");
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "历史记录加载失败"); }
    finally { setLoading(false); }
  }, [page, projectId, provider, query, status]);
  useEffect(() => { void load(); }, [load]);

  return <div className="min-w-0 space-y-6 overflow-x-hidden">
    <PageHeader title="Monitoring History" description="按平台、状态和关键词检索真实 AI Search Provider 执行历史。" action={<Button asChild variant="outline" className="min-h-11"><Link href={`/projects/${projectId}/geo/monitoring-center`}><ArrowLeft className="h-4 w-4" />返回监控中心</Link></Button>} />
    <Card className="glass-panel border-white/10"><CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_180px_180px_auto]">
      <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索失败原因、Provider 或状态" className="min-h-11 min-w-0" />
      <Select value={provider} onChange={(event) => { setPage(1); setProvider(event.target.value as "" | AISearchProviderType); }} className="min-h-11"><option value="">全部平台</option>{Object.entries(PROVIDER_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select>
      <Select value={status} onChange={(event) => { setPage(1); setStatus(event.target.value as "" | MonitoringHistoryStatus); }} className="min-h-11"><option value="">全部状态</option><option value="SUCCEEDED">成功</option><option value="FAILED">失败</option><option value="PARTIAL">部分成功</option></Select>
      <Button className="min-h-11" onClick={() => { setPage(1); setQuery(search.trim()); }}><Search className="h-4 w-4" />搜索</Button>
    </CardContent></Card>
    {error ? <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div> : null}
    <Card className="glass-panel min-w-0 border-white/10"><CardContent className="p-4">
      {loading ? <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />正在读取真实检测历史…</div> : data?.items.length ? <div className="space-y-3">{data.items.map((item) => <article key={item.id} className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.025] p-4"><div className="flex flex-wrap items-center gap-2"><Badge variant={item.status === "SUCCEEDED" ? "success" : item.status === "FAILED" ? "warning" : "outline"}>{item.status}</Badge><strong>{PROVIDER_LABELS[item.provider]}</strong><span className="text-xs text-muted-foreground">{new Date(item.startedAt).toLocaleString("zh-CN")}</span></div><div className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4"><span>耗时：{item.durationMs === null ? "unavailable" : `${item.durationMs}ms`}</span><span>结果：{item.resultCount}</span><span>成功：{item.successCount}</span><span>失败：{item.failedCount}</span></div>{item.errorMessage ? <p className="mt-3 break-words rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{item.errorMessage}</p> : null}</article>)}</div> : <div className="flex min-h-48 flex-col items-center justify-center text-center text-sm text-muted-foreground"><History className="mb-3 h-6 w-6" />没有符合条件的真实检测历史。</div>}
      {data ? <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4"><span className="text-sm text-muted-foreground">共 {data.total} 条 · 第 {data.page}/{data.totalPages} 页</span><div className="flex gap-2"><Button variant="outline" className="min-h-11" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}><ChevronLeft className="h-4 w-4" />上一页</Button><Button variant="outline" className="min-h-11" disabled={page >= data.totalPages || loading} onClick={() => setPage((value) => value + 1)}>下一页<ChevronRight className="h-4 w-4" /></Button></div></div> : null}
    </CardContent></Card>
  </div>;
}

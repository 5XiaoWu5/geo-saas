"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, Loader2, Medal, SearchCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ReportsResponse, ProjectReport } from "@/features/reports/types";
import type { KnowledgeOverviewResponse, KnowledgeProjectSummary } from "@/features/knowledge/types";
import type { BenchmarkOverviewResponse } from "@/features/competitor-benchmark/types";

type GrowthCenterData = { report: ProjectReport | null; knowledge: KnowledgeProjectSummary | null; benchmark: BenchmarkOverviewResponse | null };

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  const data = text ? JSON.parse(text) as T & { error?: string } : {} as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "请求失败");
  return data;
}

export function GrowthCenterSummary({ projectId }: { projectId: string }) {
  const [data, setData] = useState<GrowthCenterData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setData(null);
    setError("");
    void Promise.all([
      fetch("/api/reports", { cache: "no-store" }).then(readJson<ReportsResponse>),
      fetch("/api/knowledge", { cache: "no-store" }).then(readJson<KnowledgeOverviewResponse>),
      fetch(`/api/benchmark?projectId=${encodeURIComponent(projectId)}`, { cache: "no-store" }).then(readJson<BenchmarkOverviewResponse>),
    ]).then(([reports, knowledge, benchmark]) => {
      if (!active) return;
      setData({ report: reports.reports.find((item) => item.projectId === projectId) ?? null, knowledge: knowledge.projects.find((item) => item.projectId === projectId) ?? null, benchmark });
    }).catch((requestError) => { if (active) setError(requestError instanceof Error ? requestError.message : "增长总览加载失败"); });
    return () => { active = false; };
  }, [projectId]);

  if (error) return <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">企业增长总览加载失败：{error}</div>;
  if (!data) return <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />正在汇总四类增长数据…</div>;

  const report = data.report;
  const knowledge = data.knowledge;
  const seoScore = report?.analysis ? Math.round(((report.analysis.technicalScore + report.analysis.schemaScore + report.analysis.contentScore) / 70) * 100) : null;
  const ownBenchmark = data.benchmark?.results.find((item) => item.targetType === "OWN") ?? null;
  const cards = [
    { title: "SEO 增长维度", subtitle: "SEO 增长", value: seoScore === null ? "暂无" : `${seoScore}`, detail: `${report?.analysis?.issues.filter((issue) => issue.category !== "entity").length ?? 0} 项网站问题`, icon: SearchCheck, color: "text-emerald-300", href: `/projects/${projectId}/seo` },
    { title: "AI 搜索增长维度", subtitle: "AI 搜索增长", value: report ? `${report.project.visibilityScore}` : "暂无", detail: report?.latestSimulation?.result ? `推荐概率 ${report.latestSimulation.result.probability}` : "尚无推荐模拟", icon: Sparkles, color: "text-violet-300", href: `/projects/${projectId}/geo` },
    { title: "知识增长维度", subtitle: "知识增长", value: knowledge?.knowledgeBase?.completenessScore === null || !knowledge?.knowledgeBase ? "暂无" : `${knowledge.knowledgeBase.completenessScore}`, detail: `${(knowledge?.productCount ?? 0) + (knowledge?.serviceCount ?? 0) + (knowledge?.caseCount ?? 0) + (knowledge?.documentCount ?? 0) + (knowledge?.technicalDocumentCount ?? 0)} 项企业资产`, icon: BookOpen, color: "text-cyan-300", href: `/projects/${projectId}/knowledge` },
    { title: "竞争增长维度", subtitle: "竞争增长", value: ownBenchmark?.ranking ? `第 ${ownBenchmark.ranking} 名` : "暂无", detail: data.benchmark?.status === "available" ? `${data.benchmark.gaps.filter((gap) => gap.actionable).length} 项主要差距` : "尚无 Benchmark 结果", icon: Medal, color: "text-amber-300", href: `/projects/${projectId}/competitors` },
  ];

  return <section><div className="mb-3 flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">统一增长引擎</p><h2 className="mt-1 text-lg font-semibold">企业增长中心</h2></div><Badge variant="outline">真实数据</Badge></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ title, subtitle, value, detail, icon: Icon, color, href }) => <Card key={title} className="glass-panel min-w-0 border-white/10"><CardContent className="flex h-full flex-col p-5"><div className="flex items-center justify-between gap-3"><Icon className={`h-5 w-5 ${color}`} /><span className="text-[11px] text-muted-foreground">{title}</span></div><h3 className="mt-4 font-semibold">{subtitle}</h3><p className={`mt-3 text-3xl font-semibold ${color}`}>{value}</p><p className="mt-2 flex-1 text-sm text-muted-foreground">{detail}</p><Button asChild variant="outline" className="mt-5 min-h-11 w-full"><Link href={href}>查看详情 <ArrowRight className="h-4 w-4" /></Link></Button></CardContent></Card>)}</div></section>;
}

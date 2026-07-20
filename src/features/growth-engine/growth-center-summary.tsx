"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, Loader2, Medal, SearchCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { GeoIssue } from "@/features/geo-analysis/types";
import type { GrowthWorkspaceProject } from "@/features/growth/types";
import type { KnowledgeAssessment } from "@/features/knowledge/types";
import type { BenchmarkOverviewResponse } from "@/features/competitor-benchmark/types";

type AnalysisSummary = { technicalScore: number; schemaScore: number; contentScore: number };
type GrowthCenterData = { analysis: AnalysisSummary | null; issues: GeoIssue[]; knowledge: KnowledgeAssessment; benchmark: BenchmarkOverviewResponse };

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  const data = text ? JSON.parse(text) as T & { error?: string } : {} as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "请求失败");
  return data;
}

export function GrowthCenterSummary({ project }: { project: GrowthWorkspaceProject }) {
  const [data, setData] = useState<GrowthCenterData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setData(null);
    setError("");
    void Promise.all([
      fetch(`/api/projects/${project.id}/optimization`, { cache: "no-store" }).then(readJson<{ analysis: AnalysisSummary | null; issues: GeoIssue[] }>),
      fetch(`/api/knowledge/${project.id}/assessment`, { cache: "no-store" }).then(readJson<KnowledgeAssessment>),
      fetch(`/api/benchmark?projectId=${encodeURIComponent(project.id)}`, { cache: "no-store" }).then(readJson<BenchmarkOverviewResponse>),
    ]).then(([optimization, knowledge, benchmark]) => {
      if (!active) return;
      setData({ analysis: optimization.analysis, issues: optimization.issues, knowledge, benchmark });
    }).catch((requestError) => { if (active) setError(requestError instanceof Error ? requestError.message : "增长总览加载失败"); });
    return () => { active = false; };
  }, [project.id]);

  if (error) return <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">企业增长总览加载失败：{error}</div>;
  if (!data) return <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />正在汇总四类增长数据…</div>;

  const seoScore = data.analysis ? Math.round(((data.analysis.technicalScore + data.analysis.schemaScore + data.analysis.contentScore) / 70) * 100) : null;
  const ownBenchmark = data.benchmark?.results.find((item) => item.targetType === "OWN") ?? null;
  const cards = [
    { title: "SEO 增长维度", subtitle: "SEO 增长", value: seoScore === null ? "暂无" : `${seoScore}`, detail: `${data.issues.filter((issue) => issue.category !== "entity").length} 项网站问题`, icon: SearchCheck, color: "text-emerald-300", href: `/projects/${project.id}/seo` },
    { title: "AI 搜索增长维度", subtitle: "AI 搜索增长", value: `${project.visibilityScore}`, detail: ownBenchmark?.simulationScore === null || ownBenchmark?.simulationScore === undefined ? "尚无推荐模拟证据" : `推荐概率 ${ownBenchmark.simulationScore}`, icon: Sparkles, color: "text-violet-300", href: `/projects/${project.id}/geo` },
    { title: "知识增长维度", subtitle: "知识增长", value: data.knowledge.completeness === null ? "暂无" : `${data.knowledge.completeness}`, detail: `${data.knowledge.evidenceCount} 条有效证据`, icon: BookOpen, color: "text-cyan-300", href: `/projects/${project.id}/knowledge` },
    { title: "竞争增长维度", subtitle: "竞争增长", value: ownBenchmark?.ranking ? `第 ${ownBenchmark.ranking} 名` : "暂无", detail: data.benchmark.status === "available" ? `${data.benchmark.gaps.filter((gap) => gap.actionable).length} 项主要差距` : "尚无 Benchmark 结果", icon: Medal, color: "text-amber-300", href: `/projects/${project.id}/competitors` },
  ];

  return <section><div className="mb-3 flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">统一增长引擎</p><h2 className="mt-1 text-lg font-semibold">企业增长中心</h2></div><Badge variant="outline">真实数据</Badge></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ title, subtitle, value, detail, icon: Icon, color, href }) => <Card key={title} className="glass-panel min-w-0 border-white/10"><CardContent className="flex h-full flex-col p-5"><div className="flex items-center justify-between gap-3"><Icon className={`h-5 w-5 ${color}`} /><span className="text-[11px] text-muted-foreground">{title}</span></div><h3 className="mt-4 font-semibold">{subtitle}</h3><p className={`mt-3 text-3xl font-semibold ${color}`}>{value}</p><p className="mt-2 flex-1 text-sm text-muted-foreground">{detail}</p><Button asChild variant="outline" className="mt-5 min-h-11 w-full"><Link href={href}>查看详情 <ArrowRight className="h-4 w-4" /></Link></Button></CardContent></Card>)}</div></section>;
}

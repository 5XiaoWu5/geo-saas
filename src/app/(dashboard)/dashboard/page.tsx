"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowRight, CheckCircle2, CircleDashed, Gauge, Medal, SearchCheck, Sparkles, Target } from "lucide-react";
import { PageHeader } from "@/components/shared/page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { ReportsResponse, ProjectReport } from "@/features/reports/types";
import type { KnowledgeAssessment, KnowledgeOverviewResponse } from "@/features/knowledge/types";
import type { BenchmarkOverviewResponse, CompetitorWorkspaceResponse } from "@/features/competitor-benchmark/types";
import { buildGrowthOpportunities } from "@/features/growth-engine/opportunities";
import type { GrowthOpportunity } from "@/features/growth-engine/types";
import { getHostname } from "@/lib/format";

type DashboardData = {
  reports: ReportsResponse;
  knowledge: KnowledgeOverviewResponse;
  assessment: KnowledgeAssessment | null;
  benchmark: BenchmarkOverviewResponse | null;
  competitors: CompetitorWorkspaceResponse | null;
};

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  const body = text ? JSON.parse(text) as T & { error?: string } : {} as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? "请求失败");
  return body;
}

async function loadDashboard(): Promise<DashboardData> {
  const [reports, knowledge] = await Promise.all([
    fetch("/api/reports", { cache: "no-store" }).then(readJson<ReportsResponse>),
    fetch("/api/knowledge", { cache: "no-store" }).then(readJson<KnowledgeOverviewResponse>),
  ]);
  const projectId = reports.reports[0]?.projectId;
  if (!projectId) return { reports, knowledge, assessment: null, benchmark: null, competitors: null };
  const [assessment, benchmark, competitors] = await Promise.all([
    fetch(`/api/knowledge/${projectId}/assessment`, { cache: "no-store" }).then(readJson<KnowledgeAssessment>),
    fetch(`/api/benchmark?projectId=${encodeURIComponent(projectId)}`, { cache: "no-store" }).then(readJson<BenchmarkOverviewResponse>),
    fetch(`/api/competitors?projectId=${encodeURIComponent(projectId)}`, { cache: "no-store" }).then(readJson<CompetitorWorkspaceResponse>),
  ]);
  return { reports, knowledge, assessment, benchmark, competitors };
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void loadDashboard().then((result) => { if (active) setData(result); }).catch((requestError) => { if (active) setError(requestError instanceof Error ? requestError.message : "数据加载失败"); });
    return () => { active = false; };
  }, []);

  const report = data?.reports.reports[0] ?? null;
  const knowledgeSummary = report ? data?.knowledge.projects.find((item) => item.projectId === report.projectId) ?? null : null;
  const opportunities = report ? buildGrowthOpportunities({ projectId: report.projectId, analysisIssues: report.analysis?.issues, knowledgeGaps: data?.assessment?.missing, benchmarkGaps: data?.benchmark?.gaps }) : [];

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <PageHeader title="增长驾驶舱" description="用真实项目数据统一查看 SEO、AI 搜索、企业知识、竞争位置与下一步行动。" action={<Button asChild className="min-h-11"><Link href="/growth">进入企业增长中心 <ArrowRight className="h-4 w-4" /></Link></Button>} />
      {error ? <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">Dashboard 数据加载失败：{error}</div> : null}
      {!data && !error ? <DashboardLoading /> : data && !report ? <EmptyDashboard /> : report ? <>
        <ProjectPulse report={report} knowledgeScore={data?.assessment?.completeness ?? knowledgeSummary?.knowledgeBase?.completenessScore ?? null} opportunityCount={opportunities.filter((item) => !item.trackedTaskId).length} />
        <section className="grid gap-5 xl:grid-cols-3">
          <SeoStatus report={report} />
          <AiSearchStatus report={report} knowledgeScore={data?.assessment?.completeness ?? null} benchmark={data?.benchmark ?? null} />
          <CompetitiveStatus report={report} benchmark={data?.benchmark ?? null} competitorCount={data?.competitors?.competitors.length ?? 0} />
        </section>
        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <PriorityActions report={report} opportunities={opportunities} />
          <GrowthFlow report={report} hasKnowledge={Boolean(knowledgeSummary?.knowledgeBase)} hasCompetitors={Boolean(data?.competitors?.competitors.length)} />
        </section>
        <RecentProjects reports={data?.reports.reports ?? []} />
      </> : null}
    </div>
  );
}

function ProjectPulse({ report, knowledgeScore, opportunityCount }: { report: ProjectReport; knowledgeScore: number | null; opportunityCount: number }) {
  const seoHealth = seoHealthScore(report);
  const recommendation = report.latestSimulation?.result?.probability ?? null;
  const items = [
    { label: "SEO 健康度", value: score(seoHealth), detail: "技术、Schema 与内容", tone: "text-emerald-300" },
    { label: "AI 可见性", value: score(report.project.visibilityScore), detail: "项目当前可见性信号", tone: "text-violet-300" },
    { label: "知识完整度", value: score(knowledgeScore), detail: "严格证据模式", tone: "text-cyan-300" },
    { label: "AI 推荐概率", value: score(recommendation), detail: recommendation === null ? "尚无模拟结果" : "规则模拟结果", tone: "text-fuchsia-300" },
    { label: "优先行动", value: `${opportunityCount}`, detail: `${report.optimization.incompleteTasks} 个任务待完成`, tone: "text-amber-300" },
  ];
  return <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{items.map((item) => <Card key={item.label} className="glass-panel min-w-0 border-white/10"><CardContent className="p-4"><p className="text-xs text-muted-foreground">{item.label}</p><p className={`mt-3 text-3xl font-semibold ${item.tone}`}>{item.value}</p><p className="mt-2 truncate text-xs text-muted-foreground" title={item.detail}>{item.detail}</p></CardContent></Card>)}</section>;
}

function SeoStatus({ report }: { report: ProjectReport }) {
  const issues = report.analysis?.issues ?? [];
  const pageIssues = issues.filter((issue) => issue.category === "technical" || issue.category === "content").length;
  const schemaScore = report.analysis ? Math.round((report.analysis.schemaScore / 25) * 100) : null;
  return <StatusPanel icon={<SearchCheck className="h-5 w-5" />} title="SEO 状态" accent="text-emerald-300" href={`/projects/${report.projectId}/seo`}><StatusMetric label="网站健康度" value={score(seoHealthScore(report))} progress={seoHealthScore(report)} /><StatusMetric label="页面优化问题" value={`${pageIssues} 项`} /><StatusMetric label="Schema 状态" value={score(schemaScore)} progress={schemaScore} /></StatusPanel>;
}

function AiSearchStatus({ report, knowledgeScore, benchmark }: { report: ProjectReport; knowledgeScore: number | null; benchmark: BenchmarkOverviewResponse | null }) {
  const entityScore = report.analysis ? Math.round((report.analysis.entityScore / 30) * 100) : null;
  const recommendation = report.latestSimulation?.result?.probability ?? null;
  const latestCitation = [...report.growthTrend.points].reverse().find((point) => point.citationScore !== null)?.citationScore ?? benchmark?.results.find((item) => item.targetType === "OWN")?.citationScore ?? null;
  return <StatusPanel icon={<Sparkles className="h-5 w-5" />} title="AI 搜索状态" accent="text-violet-300" href={`/projects/${report.projectId}/geo`}><StatusMetric label="AI 理解程度" value={score(entityScore)} progress={entityScore} /><StatusMetric label="知识完整度" value={score(knowledgeScore)} progress={knowledgeScore} /><StatusMetric label="AI 推荐概率" value={score(recommendation)} /><StatusMetric label="Citation 情况" value={score(latestCitation)} /></StatusPanel>;
}

function CompetitiveStatus({ report, benchmark, competitorCount }: { report: ProjectReport; benchmark: BenchmarkOverviewResponse | null; competitorCount: number }) {
  const own = benchmark?.results.find((result) => result.targetType === "OWN") ?? null;
  const gap = benchmark?.gaps.find((item) => item.actionable) ?? null;
  return <StatusPanel icon={<Medal className="h-5 w-5" />} title="竞争状态" accent="text-amber-300" href={`/projects/${report.projectId}/competitors`}><StatusMetric label="Benchmark 排名" value={own?.ranking ? `第 ${own.ranking} 名` : "暂无结果"} /><StatusMetric label="已管理竞品" value={`${competitorCount} 家`} /><div className="rounded-2xl border border-white/10 bg-white/[0.025] p-3"><p className="text-xs text-muted-foreground">主要差距</p><p className="mt-2 text-sm font-medium">{gap ? `${gap.leadingCompetitor ?? "领先竞品"}在${benchmarkMetricLabel(gap.metric)}领先${Math.abs(gap.difference ?? 0)}分` : "暂无可用的竞争差距"}</p></div></StatusPanel>;
}

function StatusPanel({ icon, title, accent, href, children }: { icon: ReactNode; title: string; accent: string; href: string; children: ReactNode }) {
  return <Card className="glass-panel min-w-0 border-white/10"><CardHeader className="flex-row items-center justify-between gap-3"><CardTitle className={`flex items-center gap-2 text-lg ${accent}`}>{icon}{title}</CardTitle><Button asChild variant="ghost" size="sm" className="min-h-11"><Link href={href}>查看 <ArrowRight className="h-4 w-4" /></Link></Button></CardHeader><CardContent className="space-y-3">{children}</CardContent></Card>;
}

function StatusMetric({ label, value, progress }: { label: string; value: string; progress?: number | null }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-3"><div className="flex items-center justify-between gap-3 text-sm"><span className="text-muted-foreground">{label}</span><strong>{value}</strong></div>{typeof progress === "number" ? <Progress value={progress} className="mt-3" /> : null}</div>;
}

function PriorityActions({ report, opportunities }: { report: ProjectReport; opportunities: GrowthOpportunity[] }) {
  return <Card className="glass-panel min-w-0 border-white/10"><CardHeader className="flex-row items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">下一步行动</p><CardTitle className="mt-2 flex items-center gap-2 text-xl"><Target className="h-5 w-5 text-primary" />优先增长机会</CardTitle></div><Button asChild variant="outline" className="min-h-11"><Link href={`/projects/${report.projectId}/optimization`}>进入优化中心</Link></Button></CardHeader><CardContent className="space-y-3">{opportunities.length ? opportunities.slice(0, 5).map((opportunity) => <Link key={`${opportunity.source}-${opportunity.id}`} href={`/projects/${report.projectId}/optimization`} className="flex min-h-16 min-w-0 items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-3 transition hover:border-primary/30"><span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${opportunity.dimension === "SEO" ? "bg-emerald-400" : opportunity.dimension === "GEO" ? "bg-violet-400" : opportunity.dimension === "KNOWLEDGE" ? "bg-cyan-400" : "bg-amber-400"}`} /><span className="min-w-0 flex-1"><span className="block text-xs text-muted-foreground">{opportunity.sourceLabel} · {opportunity.impact}</span><span className="mt-1 block break-words text-sm font-medium">{opportunity.title}</span></span><ArrowRight className="mt-2 h-4 w-4 shrink-0 text-muted-foreground" /></Link>) : <p className="text-sm text-muted-foreground">当前没有真实数据支持的待处理增长机会。</p>}</CardContent></Card>;
}

function GrowthFlow({ report, hasKnowledge, hasCompetitors }: { report: ProjectReport; hasKnowledge: boolean; hasCompetitors: boolean }) {
  const steps = [
    ["企业网站", Boolean(report.scan)], ["SEO 分析", Boolean(report.analysis)], ["GEO AI 理解", Boolean(report.analysis)], ["企业知识画像", hasKnowledge],
    ["AI 搜索模拟", Boolean(report.latestSimulation)], ["竞品比较", hasCompetitors], ["增长机会", Boolean(report.analysis)], ["优化与追踪", report.optimization.totalTasks > 0 || report.growthTrend.points.length > 0],
  ] as const;
  return <Card className="glass-panel min-w-0 border-white/10"><CardHeader><CardTitle className="text-lg">增长数据流</CardTitle><p className="text-sm text-muted-foreground">底层模块保持独立，企业增长中心统一呈现状态。</p></CardHeader><CardContent className="grid gap-2 sm:grid-cols-2">{steps.map(([label, ready], index) => <div key={label} className="flex min-h-12 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.025] px-3"><span className="font-mono text-xs text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>{ready ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" /> : <CircleDashed className="h-4 w-4 shrink-0 text-muted-foreground" />}<span className="text-sm">{label}</span></div>)}</CardContent></Card>;
}

function RecentProjects({ reports }: { reports: ProjectReport[] }) {
  return <section><div className="mb-3 flex items-center justify-between"><h2 className="text-base font-semibold">项目增长概览</h2><Button asChild variant="ghost" className="min-h-11"><Link href="/projects">全部项目 <ArrowRight className="h-4 w-4" /></Link></Button></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{reports.slice(0, 6).map((report) => <Link href={`/projects/${report.projectId}/overview`} key={report.projectId} className="glass-panel min-h-28 min-w-0 rounded-2xl p-4 transition hover:border-primary/30"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-medium">{report.projectName}</p><p className="mt-1 truncate text-xs text-muted-foreground">{getHostname(report.websiteUrl)}</p></div><span className="shrink-0 font-mono text-lg text-primary">{report.analysis?.totalScore ?? "—"}</span></div><div className="mt-4 flex items-center justify-between text-xs text-muted-foreground"><span>{report.optimization.incompleteTasks} 项待优化</span><span>{report.growthTrend.points.length} 条增长记录</span></div></Link>)}</div></section>;
}

function DashboardLoading() {
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{Array.from({ length: 5 }, (_, index) => <div key={index} className="h-32 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />)}</div>;
}

function EmptyDashboard() {
  return <Card className="glass-panel border-white/10"><CardContent className="flex min-h-96 flex-col items-center justify-center p-8 text-center"><Gauge className="h-8 w-8 text-primary" /><h2 className="mt-4 text-xl font-semibold">创建第一个企业增长项目</h2><p className="mt-2 max-w-md text-sm text-muted-foreground">添加企业网站后，GeoPilot AI 会逐步建立 SEO、AI 搜索、知识、竞争与优化基线。</p><Button asChild className="mt-6 min-h-11"><Link href="/projects">创建项目</Link></Button></CardContent></Card>;
}

function seoHealthScore(report: ProjectReport) {
  return report.analysis ? Math.min(100, Math.round(((report.analysis.technicalScore + report.analysis.schemaScore + report.analysis.contentScore) / 70) * 100)) : null;
}

function score(value: number | null) {
  return value === null ? "暂无" : `${Math.round(value)}`;
}

function benchmarkMetricLabel(metric: string) {
  return ({ overall: "综合评分", visibility: "AI 可见性", entity: "实体理解", schema: "Schema", authority: "权威性", citation: "引用能力", simulation: "推荐概率" } as Record<string, string>)[metric] ?? metric;
}

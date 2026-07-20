"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowRight, BookOpen, CheckCircle2, ClipboardList, Eye, FileSearch, LineChart, SearchCheck, Sparkles, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/shared/page";
import type { ReportsResponse, ProjectReport } from "@/features/reports/types";
import type { KnowledgeOverviewResponse, KnowledgeProjectSummary } from "@/features/knowledge/types";
import type { GeoIssue } from "@/features/geo-analysis/types";
import { useI18n } from "@/i18n/provider";
import { getHostname } from "@/lib/format";

type DashboardData = {
  reports: ReportsResponse;
  knowledge: KnowledgeOverviewResponse;
};

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  const body = text ? JSON.parse(text) as T & { error?: string } : {} as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? "REQUEST_FAILED");
  return body;
}

async function loadDashboard(): Promise<DashboardData> {
  const [reports, knowledge] = await Promise.all([
    fetch("/api/reports", { cache: "no-store" }).then(readJson<ReportsResponse>),
    fetch("/api/knowledge", { cache: "no-store" }).then(readJson<KnowledgeOverviewResponse>),
  ]);
  return { reports, knowledge };
}

export default function DashboardPage() {
  const { t } = useI18n();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void loadDashboard().then((result) => {
      if (active) setData(result);
    }).catch((requestError) => {
      if (active) setError(requestError instanceof Error ? requestError.message : "REQUEST_FAILED");
    });
    return () => { active = false; };
  }, []);

  const report = data?.reports.reports[0] ?? null;
  const knowledge = report ? data?.knowledge.projects.find((item) => item.projectId === report.projectId) ?? null : null;

  return (
    <div className="min-w-0 overflow-x-hidden">
      <PageHeader title="增长驾驶舱" description="统一查看 SEO 健康、AI 搜索可见性、企业知识、优化任务与持续增长。" action={<Button asChild><Link href="/projects">{t("dashboard.newProject")}</Link></Button>} />

      {error ? <div className="mb-6 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-200">Dashboard 数据加载失败：{error}</div> : null}

      {!data && !error ? <DashboardLoading /> : data && !report ? <EmptyDashboard /> : report ? <>
        <GrowthScoreStrip report={report} knowledge={knowledge} />
        <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
          <OpportunityBoard report={report} knowledge={knowledge} />
          <GrowthRoute report={report} knowledge={knowledge} />
        </div>
        <RecentProjects reports={data?.reports.reports ?? []} />
      </> : null}
    </div>
  );
}

function GrowthScoreStrip({ report, knowledge }: { report: ProjectReport; knowledge: KnowledgeProjectSummary | null }) {
  const analysis = report.analysis;
  const seoHealth = analysis ? Math.min(100, Math.round(((analysis.technicalScore + analysis.schemaScore + analysis.contentScore) / 70) * 100)) : null;
  const visibility = report.scan ? report.project.visibilityScore : null;
  const knowledgeScore = knowledge?.knowledgeBase?.completenessScore ?? null;
  const overallDelta = report.growthTrend.deltas.find((item) => item.key === "overallScore")?.change ?? null;

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <ScoreCard icon={<SearchCheck className="h-4 w-4" />} label="SEO 健康度" value={scoreValue(seoHealth)} detail={seoHealth === null ? "等待网站审计" : "技术、Schema 与内容"} tone="seo" progress={seoHealth} />
      <ScoreCard icon={<Eye className="h-4 w-4" />} label="AI 可见性" value={scoreValue(visibility)} detail={visibility === null ? "等待分析" : "当前为网站信号估算"} tone="geo" progress={visibility} />
      <ScoreCard icon={<BookOpen className="h-4 w-4" />} label="知识完整度" value={scoreValue(knowledgeScore)} detail={knowledge?.knowledgeBase ? "严格证据完整度" : "尚未建立知识库"} tone="knowledge" progress={knowledgeScore} />
      <ScoreCard icon={<ClipboardList className="h-4 w-4" />} label="待优化任务" value={String(report.optimization.incompleteTasks)} detail={`${report.optimization.completedTasks} 已完成 · ${report.optimization.totalTasks} 总计`} tone="tasks" />
      <ScoreCard icon={<LineChart className="h-4 w-4" />} label="增长趋势" value={overallDelta === null ? "—" : `${overallDelta > 0 ? "+" : ""}${overallDelta}`} detail="最近 30 天总分变化" tone="growth" />
    </section>
  );
}

function ScoreCard({ icon, label, value, detail, tone, progress }: { icon: ReactNode; label: string; value: string; detail: string; tone: "seo" | "geo" | "knowledge" | "tasks" | "growth"; progress?: number | null }) {
  const tones = {
    seo: "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-300",
    geo: "border-violet-400/20 bg-violet-400/[0.06] text-violet-300",
    knowledge: "border-cyan-400/20 bg-cyan-400/[0.06] text-cyan-300",
    tasks: "border-amber-400/20 bg-amber-400/[0.06] text-amber-300",
    growth: "border-blue-400/20 bg-blue-400/[0.06] text-blue-300",
  } as const;
  return (
    <div className={`min-w-0 rounded-2xl border p-4 ${tones[tone]}`}>
      <div className="flex items-center gap-2 text-xs font-medium">{icon}<span>{label}</span></div>
      <p className="mt-4 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
      {typeof progress === "number" ? <Progress value={progress} className="mt-3" /> : null}
      <p className="mt-3 truncate text-xs text-muted-foreground" title={detail}>{detail}</p>
    </div>
  );
}

function OpportunityBoard({ report, knowledge }: { report: ProjectReport; knowledge: KnowledgeProjectSummary | null }) {
  const issues = report.analysis?.issues ?? [];
  const seoIssues = issues.filter((issue) => issue.category !== "entity").slice(0, 3);
  const geoIssues = issues.filter((issue) => issue.category === "entity").slice(0, 2);
  const knowledgeGaps = knowledge ? buildKnowledgeGaps(knowledge) : ["尚未建立企业知识库"];

  return (
    <Card className="glass-panel min-w-0 border-white/10">
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">优先信号</p><CardTitle className="mt-2 flex items-center gap-2 text-xl"><Target className="h-5 w-5 text-primary" />主要增长机会</CardTitle></div>
        <Button asChild variant="outline" size="sm"><Link href={`/projects/${report.projectId}/optimization`}>查看任务</Link></Button>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-2">
        <OpportunityColumn title="SEO 增长" accent="bg-emerald-400" empty="最新网站分析未发现 SEO 结构问题。" issues={seoIssues} href={`/projects/${report.projectId}/seo`} />
        <div className="space-y-4">
          <OpportunityColumn title="AI 搜索增长" accent="bg-violet-400" empty="最新分析未发现实体理解问题。" issues={geoIssues} href={`/projects/${report.projectId}/geo`} />
          <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.04] p-4">
            <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">知识准备度</h3><Link href={`/projects/${report.projectId}/knowledge`} className="text-xs font-medium text-primary">完善资料</Link></div>
            <ul className="mt-3 space-y-2">{knowledgeGaps.slice(0, 3).map((gap) => <li key={gap} className="flex items-start gap-2 text-sm text-muted-foreground"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" />{gap}</li>)}</ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OpportunityColumn({ title, accent, empty, issues, href }: { title: string; accent: string; empty: string; issues: GeoIssue[]; href: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
      <div className="flex items-center justify-between gap-3"><h3 className="flex items-center gap-2 text-sm font-semibold"><span className={`h-2 w-2 rounded-full ${accent}`} />{title}</h3><Link href={href} className="text-xs font-medium text-primary">进入 <ArrowRight className="ml-1 inline h-3 w-3" /></Link></div>
      {issues.length ? <ul className="mt-4 space-y-3">{issues.map((issue) => <li key={`${issue.category}-${issue.title}`} className="rounded-xl border border-white/10 bg-black/10 p-3"><p className="text-sm font-medium">{issue.title}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{issue.description}</p></li>)}</ul> : <p className="mt-4 text-sm text-muted-foreground">{empty}</p>}
    </div>
  );
}

function GrowthRoute({ report, knowledge }: { report: ProjectReport; knowledge: KnowledgeProjectSummary | null }) {
  const steps = [
    { label: "网站证据", ready: Boolean(report.scan), href: `/projects/${report.projectId}/overview`, icon: FileSearch },
    { label: "企业知识", ready: Boolean(knowledge?.knowledgeBase), href: `/projects/${report.projectId}/knowledge`, icon: BookOpen },
    { label: "AI 推荐", ready: Boolean(report.latestSimulation), href: `/projects/${report.projectId}/geo`, icon: Sparkles },
    { label: "优化任务", ready: report.optimization.totalTasks > 0, href: `/projects/${report.projectId}/optimization`, icon: ClipboardList },
  ];
  return (
    <Card className="glass-panel min-w-0 border-white/10">
      <CardHeader><p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">当前项目</p><CardTitle className="mt-2 truncate text-xl">{report.projectName}</CardTitle><p className="truncate text-sm text-muted-foreground">{getHostname(report.websiteUrl)}</p></CardHeader>
      <CardContent className="space-y-3">
        {steps.map((step, index) => { const Icon = step.icon; return <Link href={step.href} key={step.label} className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-3 transition hover:border-primary/30 hover:bg-white/[0.05]"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-primary"><Icon className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="text-xs text-muted-foreground">第 {index + 1} 步</p><p className="truncate text-sm font-medium">{step.label}</p></div>{step.ready ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" /> : <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />}</Link>; })}
      </CardContent>
    </Card>
  );
}

function RecentProjects({ reports }: { reports: ProjectReport[] }) {
  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between"><h2 className="text-base font-semibold">项目增长概览</h2><Button asChild variant="ghost" size="sm"><Link href="/projects">全部项目 <ArrowRight className="h-4 w-4" /></Link></Button></div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{reports.slice(0, 6).map((report) => <Link href={`/projects/${report.projectId}/overview`} key={report.projectId} className="glass-panel min-w-0 rounded-2xl p-4 transition hover:border-primary/30 hover:bg-white/[0.06]"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-medium">{report.projectName}</p><p className="mt-1 truncate text-xs text-muted-foreground">{getHostname(report.websiteUrl)}</p></div><span className="shrink-0 font-mono text-lg text-primary">{report.analysis?.totalScore ?? "—"}</span></div><div className="mt-4 flex items-center justify-between text-xs text-muted-foreground"><span>{report.optimization.incompleteTasks} 待优化</span><span>{report.growthTrend.points.length} 增长记录</span></div></Link>)}</div>
    </section>
  );
}

function DashboardLoading() {
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{Array.from({ length: 5 }, (_, index) => <div key={index} className="h-36 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />)}</div>;
}

function EmptyDashboard() {
  return <div className="glass-panel flex min-h-96 flex-col items-center justify-center rounded-3xl p-8 text-center"><Sparkles className="h-8 w-8 text-primary" /><h2 className="mt-4 text-xl font-semibold">创建第一个增长项目</h2><p className="mt-2 max-w-md text-sm text-muted-foreground">添加企业网站后，GeoPilot AI 会建立 SEO、AI 搜索、知识与优化基线。</p><Button asChild className="mt-6"><Link href="/projects">创建项目</Link></Button></div>;
}

function buildKnowledgeGaps(summary: KnowledgeProjectSummary) {
  const gaps: string[] = [];
  if (!summary.productCount) gaps.push("缺少产品资料");
  if (!summary.serviceCount) gaps.push("缺少服务资料");
  if (!summary.caseCount) gaps.push("缺少客户案例");
  if (!summary.documentCount && !summary.technicalDocumentCount) gaps.push("缺少技术文档或认证证据");
  return gaps.length ? gaps : ["核心企业知识资产已经建立"];
}

function scoreValue(value: number | null) {
  return value === null ? "—" : `${value}`;
}

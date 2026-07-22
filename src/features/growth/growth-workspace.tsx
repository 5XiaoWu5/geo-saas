"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowRight, BarChart3, Bot, Globe2, Loader2, SearchCheck, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/shared/page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/i18n/provider";
import { GrowthSummary } from "./components/GrowthSummary";
import { GrowthTimeline } from "./components/GrowthTimeline";
import { ImprovementCard } from "./components/ImprovementCard";
import { MetricHistory } from "./components/MetricHistory";
import { TrendChart } from "./components/TrendChart";
import { GROWTH_RANGES, type GrowthRange, type GrowthWorkspaceResponse } from "./types";
import { GrowthCenterSummary } from "@/features/growth-engine/growth-center-summary";

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  const data = text ? JSON.parse(text) as T & { error?: string } : {} as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "REQUEST_FAILED");
  return data;
}

function growthUrl(projectId: string, range: GrowthRange) {
  const params = new URLSearchParams({ range });
  if (projectId) params.set("projectId", projectId);
  return `/api/growth?${params.toString()}`;
}

export function GrowthWorkspace({ initialProjectId, view = "timeline" }: { initialProjectId?: string; view?: "overview" | "timeline" }) {
  const { locale, t } = useI18n();
  const [data, setData] = useState<GrowthWorkspaceResponse | null>(null);
  const [projectId, setProjectId] = useState(initialProjectId ?? "");
  const [range, setRange] = useState<GrowthRange>("30d");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (nextProjectId: string, nextRange: GrowthRange) => {
    const result = await readJson<GrowthWorkspaceResponse>(await fetch(growthUrl(nextProjectId, nextRange), { cache: "no-store" }));
    setData(result);
    setProjectId(result.selectedProjectId ?? "");
  }, []);

  useEffect(() => {
    let mounted = true;
    load(initialProjectId ?? "", "30d")
      .catch((requestError) => { if (mounted) setError(requestError instanceof Error ? requestError.message : "REQUEST_FAILED"); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [initialProjectId, load]);

  const activeProject = useMemo(() => data?.projects.find((project) => project.id === projectId) ?? data?.projects[0] ?? null, [data?.projects, projectId]);
  const errorMessage = error ? (() => { const key = `growth.errors.${error}`; const translated = t(key); return translated === key ? error : translated; })() : "";

  async function selectProject(nextProjectId: string) {
    setLoading(true); setError("");
    try { await load(nextProjectId, range); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "REQUEST_FAILED"); } finally { setLoading(false); }
  }

  async function selectRange(nextRange: GrowthRange) {
    setRange(nextRange); setLoading(true); setError("");
    try { await load(projectId, nextRange); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "REQUEST_FAILED"); } finally { setLoading(false); }
  }

  if (loading && !data) return <div><PageHeader title={t("growth.title")} description={t("growth.description")} /><div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{t("growth.loading")}</div></div>;

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader title={locale === "zh" ? (view === "overview" ? "企业增长总览（Growth Overview）" : "企业增长中心（Growth Center）") : (view === "overview" ? "Growth Overview" : "Growth Center")} description={locale === "zh" ? "统一查看 SEO、AI 搜索、企业知识与竞争增长，并保持底层增长引擎独立。" : "Review SEO, AI search, company knowledge, and competitive growth while each underlying engine remains independent."} action={<div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row"><Button asChild variant="outline" className="min-h-11"><Link href={activeProject ? `/projects/${activeProject.id}/growth` : "/growth"}>{locale === "zh" ? "增长时间线（Growth Timeline）" : "Growth Timeline"} <TrendingUp className="h-4 w-4" /></Link></Button><Button asChild className="min-h-11"><Link href={activeProject ? `/projects/${activeProject.id}/optimization` : "/optimization"}>{locale === "zh" ? "进入优化中心（Optimization Center）" : "Optimization Center"} <ArrowRight className="h-4 w-4" /></Link></Button></div>} />
      {errorMessage ? <div className="flex gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"><AlertCircle className="h-4 w-4 shrink-0" />{errorMessage}</div> : null}

      {!data?.projects.length ? <Card className="glass-panel border-white/10"><CardContent className="p-6"><p className="text-sm text-muted-foreground">{t("growth.noProjects")}</p><Button asChild className="mt-4"><Link href="/projects">{t("growth.goToProjects")}</Link></Button></CardContent></Card> : activeProject ? <>
        <Card className="glass-panel border-white/10"><CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="text-sm text-muted-foreground">{t("growth.project")}</p><select value={projectId} onChange={(event) => void selectProject(event.target.value)} className="mt-2 h-11 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm sm:w-72">{data.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></div><div className="-mx-1 overflow-x-auto px-1 pb-1"><div className="flex min-w-max gap-2">{GROWTH_RANGES.map((item) => <Button key={item} size="sm" className="min-h-11" variant={range === item ? "default" : "outline"} onClick={() => void selectRange(item)}>{t(`growth.ranges.${item}`)}</Button>)}</div></div></CardContent></Card>

        <GrowthCenterSummary project={activeProject} />

        <GrowthEngineBridge projectId={activeProject.id} locale={locale} />

        <GrowthSummary project={activeProject} />

        <section><div className="mb-3 flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /><h2 className="text-lg font-semibold text-foreground">{t("growth.improvementSummary")}</h2></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">{data.trend.deltas.map((delta) => <ImprovementCard key={delta.key} delta={delta} />)}</div></section>

        <TrendChart snapshots={data.trend.points} />

        <section className="grid min-w-0 gap-6 xl:grid-cols-[0.9fr_1.1fr]"><GrowthTimeline snapshots={data.snapshots} /><MetricHistory snapshots={data.trend.points} /></section>

        <Card className="glass-panel border-white/10"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><BarChart3 className="h-5 w-5 text-primary" />{t("growth.campaignImpact")}</CardTitle></CardHeader><CardContent>{data.campaignImpact.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{data.campaignImpact.map((impact) => <div key={impact.campaignId} className="min-w-0 rounded-xl border border-white/10 bg-white/[0.03] p-4"><p className="break-words font-medium text-foreground">{impact.campaignName}</p><div className="mt-3 grid grid-cols-3 gap-2 text-xs"><ImpactMetric label={t("growth.snapshotCount")} value={`${impact.snapshotCount}`} /><ImpactMetric label={t("growth.metrics.visibilityScore")} value={formatChange(impact.visibilityChange)} /><ImpactMetric label={t("growth.metrics.overallScore")} value={formatChange(impact.overallChange)} /></div></div>)}</div> : <p className="text-sm text-muted-foreground">{t("growth.noCampaignImpact")}</p>}</CardContent></Card>
      </> : null}
    </div>
  );
}

function GrowthEngineBridge({ projectId, locale }: { projectId: string; locale: "zh" | "en" }) {
  const flows = [
    { icon: SearchCheck, title: "SEO Growth Engine", target: locale === "zh" ? "搜索引擎理解" : "search engine understanding", steps: ["WebsiteScan", "Technical SEO / Content / Schema", locale === "zh" ? "索引与自然搜索增长" : "Indexing and organic search growth"], href: `/projects/${projectId}/seo`, color: "text-emerald-300", border: "border-emerald-300/20" },
    { icon: Bot, title: "AI Search Growth Engine", target: locale === "zh" ? "AI 模型理解" : "AI model understanding", steps: ["Website Content + Knowledge Assets", "Company Knowledge Profile", locale === "zh" ? "GEO / 可见性 / 推荐增长" : "GEO / Visibility / Recommendation Growth"], href: `/projects/${projectId}/geo`, color: "text-violet-300", border: "border-violet-300/20" },
  ];
  return <section className="grid gap-4 lg:grid-cols-2">{flows.map(({ icon: Icon, title, target, steps, href, color, border }) => <Card key={title} className={`glass-panel min-w-0 ${border}`}><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div><p className={`flex items-center gap-2 font-semibold ${color}`}><Icon className="h-5 w-5" />{title}</p><p className="mt-2 text-sm text-muted-foreground">{locale === "zh" ? "负责" : "Responsible for "}{target}</p></div><Globe2 className="h-5 w-5 text-muted-foreground" /></div><div className="mt-5 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">{steps.map((step, index) => <div key={step} className="contents"><div className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.025] px-3 py-3 text-xs">{step}</div>{index < steps.length - 1 ? <ArrowRight className="h-4 w-4 shrink-0 rotate-90 text-muted-foreground sm:rotate-0" /> : null}</div>)}</div><Button asChild variant="outline" className="mt-5 min-h-11 w-full"><Link href={href}>{locale === "zh" ? "进入增长引擎" : "Open growth engine"} <ArrowRight className="h-4 w-4" /></Link></Button></CardContent></Card>)}</section>;
}

function ImpactMetric({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 rounded-lg border border-white/10 p-2"><p className="truncate text-muted-foreground">{label}</p><p className="mt-1 font-mono text-foreground">{value}</p></div>;
}

function formatChange(value: number | null) {
  return value === null ? "-" : `${value > 0 ? "+" : ""}${value}`;
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowRight, BarChart3, Loader2, TrendingUp } from "lucide-react";
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

export function GrowthWorkspace({ initialProjectId }: { initialProjectId?: string }) {
  const { t } = useI18n();
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
      <PageHeader title={t("growth.title")} description={t("growth.description")} action={<Button asChild variant="outline"><Link href="/analyzer">{t("growth.openAnalyzer")} <ArrowRight className="h-4 w-4" /></Link></Button>} />
      {errorMessage ? <div className="flex gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"><AlertCircle className="h-4 w-4 shrink-0" />{errorMessage}</div> : null}

      {!data?.projects.length ? <Card className="glass-panel border-white/10"><CardContent className="p-6"><p className="text-sm text-muted-foreground">{t("growth.noProjects")}</p><Button asChild className="mt-4"><Link href="/projects">{t("growth.goToProjects")}</Link></Button></CardContent></Card> : activeProject ? <>
        <Card className="glass-panel border-white/10"><CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="text-sm text-muted-foreground">{t("growth.project")}</p><select value={projectId} onChange={(event) => void selectProject(event.target.value)} className="mt-2 h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm sm:w-72">{data.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></div><div className="-mx-1 overflow-x-auto px-1 pb-1"><div className="flex min-w-max gap-2">{GROWTH_RANGES.map((item) => <Button key={item} size="sm" variant={range === item ? "default" : "outline"} onClick={() => void selectRange(item)}>{t(`growth.ranges.${item}`)}</Button>)}</div></div></CardContent></Card>

        <GrowthSummary project={activeProject} />

        <section><div className="mb-3 flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /><h2 className="text-lg font-semibold text-foreground">{t("growth.improvementSummary")}</h2></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">{data.trend.deltas.map((delta) => <ImprovementCard key={delta.key} delta={delta} />)}</div></section>

        <TrendChart snapshots={data.trend.points} />

        <section className="grid min-w-0 gap-6 xl:grid-cols-[0.9fr_1.1fr]"><GrowthTimeline snapshots={data.snapshots} /><MetricHistory snapshots={data.trend.points} /></section>

        <Card className="glass-panel border-white/10"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><BarChart3 className="h-5 w-5 text-primary" />{t("growth.campaignImpact")}</CardTitle></CardHeader><CardContent>{data.campaignImpact.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{data.campaignImpact.map((impact) => <div key={impact.campaignId} className="min-w-0 rounded-xl border border-white/10 bg-white/[0.03] p-4"><p className="break-words font-medium text-foreground">{impact.campaignName}</p><div className="mt-3 grid grid-cols-3 gap-2 text-xs"><ImpactMetric label={t("growth.snapshotCount")} value={`${impact.snapshotCount}`} /><ImpactMetric label={t("growth.metrics.visibilityScore")} value={formatChange(impact.visibilityChange)} /><ImpactMetric label={t("growth.metrics.overallScore")} value={formatChange(impact.overallChange)} /></div></div>)}</div> : <p className="text-sm text-muted-foreground">{t("growth.noCampaignImpact")}</p>}</CardContent></Card>
      </> : null}
    </div>
  );
}

function ImpactMetric({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 rounded-lg border border-white/10 p-2"><p className="truncate text-muted-foreground">{label}</p><p className="mt-1 font-mono text-foreground">{value}</p></div>;
}

function formatChange(value: number | null) {
  return value === null ? "-" : `${value > 0 ? "+" : ""}${value}`;
}


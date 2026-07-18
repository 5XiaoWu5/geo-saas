"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertCircle, ArrowRight, BookOpen, BrainCircuit, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/i18n/provider";
import type { InsightsResponse } from "./types";
import { ExplainScoreCard } from "./components/ExplainScoreCard";
import { NegativeSignals } from "./components/NegativeSignals";
import { PositiveSignals } from "./components/PositiveSignals";
import { RecommendationList } from "./components/RecommendationList";

export function InsightsWorkspace({ initialProjectId }: { initialProjectId?: string }) {
  const { t } = useI18n();
  const [data, setData] = useState<InsightsResponse | null>(null);
  const [projectId, setProjectId] = useState(initialProjectId ?? "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let mounted = true;
    const params = initialProjectId ? `?projectId=${encodeURIComponent(initialProjectId)}` : "";
    fetch(`/api/insights${params}`, { cache: "no-store" }).then(async (response) => {
      const payload = await response.json() as InsightsResponse;
      if (!response.ok) throw new Error(payload.error ?? "REQUEST_FAILED");
      if (mounted) { setData(payload); setProjectId(payload.selectedProjectId ?? ""); }
    }).catch((requestError) => { if (mounted) setError(requestError instanceof Error ? requestError.message : "REQUEST_FAILED"); }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [initialProjectId]);

  const errorText = error ? (t(`insights.errors.${error}`) === `insights.errors.${error}` ? error : t(`insights.errors.${error}`)) : "";
  if (loading) return <div><PageHeader title={t("insights.title")} description={t("insights.description")} /><div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> {t("insights.loading")}</div></div>;
  if (errorText) return <div><PageHeader title={t("insights.title")} description={t("insights.description")} /><div className="flex gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"><AlertCircle className="h-4 w-4 shrink-0" /> {errorText}</div></div>;
  if (!data?.projects.length) return <div><PageHeader title={t("insights.title")} description={t("insights.description")} /><Card className="glass-panel border-white/10"><CardContent className="p-6"><p className="text-sm text-muted-foreground">{t("insights.unavailableDescription")}</p><Button asChild className="mt-4"><Link href="/projects">{t("campaigns.goToProjects")} <ArrowRight className="h-4 w-4" /></Link></Button></CardContent></Card></div>;
  const active = data.insights.find((insight) => insight.projectId === projectId) ?? data.insights[0];
  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <PageHeader title={t("insights.title")} description={t("insights.description")} action={<Button asChild variant="outline"><Link href="/analyzer">{t("growth.openAnalyzer")} <ArrowRight className="h-4 w-4" /></Link></Button>} />
      <div className="flex max-w-full gap-2 overflow-x-auto pb-1">{data.projects.map((project) => <button key={project.id} onClick={() => setProjectId(project.id)} className={`shrink-0 rounded-xl border px-4 py-2 text-sm transition ${active.projectId === project.id ? "border-primary/40 bg-primary/15 text-primary" : "border-white/10 bg-white/[0.03] text-muted-foreground hover:text-foreground"}`}>{project.name}</button>)}</div>
      {active.status === "unavailable" ? <Card className="glass-panel border-white/10"><CardContent className="p-6"><div className="flex items-start gap-3"><BrainCircuit className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div><p className="font-medium text-foreground">{t("insights.unavailable")}</p><p className="mt-2 text-sm text-muted-foreground">{t("insights.unavailableDescription")}</p>{active.unavailableSources.length ? <p className="mt-3 text-xs text-muted-foreground">{t("insights.unavailableSources")}: {active.unavailableSources.map((source) => t(`insights.sourceTypes.${source.sourceType}`)).join(" · ")}</p> : null}</div></div></CardContent></Card> : <><section className="grid min-w-0 gap-6 xl:grid-cols-[0.75fr_1.25fr]"><ExplainScoreCard insight={active} /><RecommendationList projectId={active.projectId} recommendations={active.recommendations} /></section><section className="grid min-w-0 gap-6 xl:grid-cols-2"><PositiveSignals signals={active.positiveSignals} /><NegativeSignals negative={active.negativeSignals} missing={active.missingSignals} /></section></>}
      {active.knowledgeInsight ? <Card className="min-w-0 border-white/10 bg-white/[0.03]"><CardContent className="flex min-w-0 flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="flex items-center gap-2 text-sm font-medium"><BookOpen className="h-4 w-4 text-primary" />{t("knowledge.intelligence.knowledgeGaps")}</p><p className="mt-2 break-words text-sm text-muted-foreground">{active.knowledgeInsight.gaps.map((gap) => t(`knowledge.intelligence.gapLabels.${gap.type}`)).join(" · ")}</p></div><Button asChild variant="outline" className="min-h-11 w-full shrink-0 sm:w-auto"><Link href={active.knowledgeInsight.deepLink}>{t("knowledge.intelligence.open")}<ArrowRight className="h-4 w-4" /></Link></Button></CardContent></Card> : null}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BrainCircuit, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/i18n/provider";
import type { ProjectInsight } from "../types";

export function InsightSummary({ projectId, initialInsight }: { projectId: string; initialInsight?: ProjectInsight | null }) {
  const { t } = useI18n();
  const [insight, setInsight] = useState<ProjectInsight | null>(initialInsight ?? null);
  const [loading, setLoading] = useState(initialInsight === undefined);
  useEffect(() => {
    if (initialInsight !== undefined) return;
    let mounted = true;
    fetch(`/api/insights/${projectId}`, { cache: "no-store" }).then(async (response) => {
      const payload = await response.json() as ProjectInsight;
      if (mounted && response.ok) setInsight(payload);
    }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [initialInsight, projectId]);
  if (loading) return <Card className="glass-panel border-white/10"><CardContent className="flex items-center gap-2 p-5 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> {t("insights.loading")}</CardContent></Card>;
  return (
    <Card className="glass-panel border-white/10">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0"><p className="flex items-center gap-2 text-sm font-medium text-primary"><BrainCircuit className="h-4 w-4" /> {t("insights.analyzerTitle")}</p>{insight?.status === "available" ? <div className="mt-2 flex flex-wrap items-baseline gap-3"><span className="font-mono text-3xl font-semibold text-foreground">{insight.score}</span><span className="text-sm text-muted-foreground">{t("insights.confidence")}: {insight.confidence}%</span><span className="text-sm text-emerald-400">+{insight.positiveSignals.reduce((sum, signal) => sum + signal.value, 0)}</span><span className="text-sm text-rose-400">-{[...insight.negativeSignals, ...insight.missingSignals].reduce((sum, signal) => sum + signal.value, 0)}</span></div> : <p className="mt-2 text-sm text-muted-foreground">{t("insights.unavailable")}</p>}</div>
        <Button asChild variant="outline" size="sm" className="w-full shrink-0 sm:w-auto"><Link href={`/project/${projectId}/insights`}>{t("insights.viewInsights")} <ArrowRight className="h-4 w-4" /></Link></Button>
      </CardContent>
    </Card>
  );
}


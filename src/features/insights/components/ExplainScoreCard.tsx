"use client";

import { CircleGauge, Database, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useI18n } from "@/i18n/provider";
import type { ProjectInsight } from "../types";

export function ExplainScoreCard({ insight }: { insight: ProjectInsight }) {
  const { t } = useI18n();
  if (insight.status === "unavailable" || insight.score === null || !insight.anchor) return null;
  const deductions = [...insight.negativeSignals, ...insight.missingSignals].reduce((sum, signal) => sum + signal.value, 0);
  return (
    <Card className="glass-panel border-white/10">
      <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><CircleGauge className="h-5 w-5 text-primary" /> {t("insights.currentScore")}</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><span className="font-mono text-5xl font-semibold text-primary">{insight.score}</span><span className="ml-2 text-sm text-muted-foreground">/100</span></div>
          <div className="grid min-w-0 gap-2 text-xs text-muted-foreground sm:text-right">
            <span className="flex items-center gap-2 sm:justify-end"><Database className="h-4 w-4" /> {t("insights.scoreSource")}: {t(`insights.sourceTypes.${insight.anchor.sourceType}`)}</span>
            <span className="flex items-center gap-2 sm:justify-end"><ShieldCheck className="h-4 w-4" /> {t("insights.confidence")}: {insight.confidence}%</span>
          </div>
        </div>
        <Progress value={insight.score} />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4"><p className="text-xs text-muted-foreground">{t("insights.positiveTotal")}</p><p className="mt-1 font-mono text-2xl font-semibold text-emerald-400">+{insight.score}</p></div>
          <div className="rounded-xl border border-rose-400/20 bg-rose-400/[0.06] p-4"><p className="text-xs text-muted-foreground">{t("insights.deductionTotal")}</p><p className="mt-1 font-mono text-2xl font-semibold text-rose-400">-{deductions}</p></div>
        </div>
      </CardContent>
    </Card>
  );
}


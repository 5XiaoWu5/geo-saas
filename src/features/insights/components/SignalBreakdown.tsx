"use client";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useI18n } from "@/i18n/provider";
import type { InsightSignal } from "../types";

export function SignalBreakdown({ signals }: { signals: InsightSignal[] }) {
  const { t } = useI18n();
  if (!signals.length) return <p className="text-sm text-muted-foreground">{t("insights.noSignals")}</p>;
  return (
    <div className="space-y-3">
      {signals.map((signal) => (
        <div key={`${signal.kind}:${signal.signalKey}`} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0"><p className="break-words text-sm font-medium text-foreground">{t(`insights.signals.${signal.signalKey}.label`)}</p><p className="mt-1 break-words text-xs text-muted-foreground">{t(`insights.signals.${signal.signalKey}.explanation`)}</p></div>
            <div className="flex shrink-0 items-center gap-2"><Badge variant="outline">{t(`insights.sourceTypes.${signal.sourceType}`)}</Badge><span className={signal.kind === "positive" ? "font-mono text-sm font-semibold text-emerald-400" : "font-mono text-sm font-semibold text-rose-400"}>{signal.kind === "positive" ? "+" : "-"}{signal.value}</span></div>
          </div>
          <Progress value={signal.value} className="mt-3" />
          <p className="mt-2 text-xs text-muted-foreground">{t("insights.confidence")}: {signal.confidence}%</p>
        </div>
      ))}
    </div>
  );
}


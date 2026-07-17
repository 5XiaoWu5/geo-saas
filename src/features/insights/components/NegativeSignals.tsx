"use client";

import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/i18n/provider";
import type { InsightSignal } from "../types";
import { SignalBreakdown } from "./SignalBreakdown";

export function NegativeSignals({ negative, missing }: { negative: InsightSignal[]; missing: InsightSignal[] }) {
  const { t } = useI18n();
  return <Card className="glass-panel border-white/10"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><AlertTriangle className="h-5 w-5 text-rose-400" /> {t("insights.negativeSignals")}</CardTitle></CardHeader><CardContent className="space-y-5"><SignalBreakdown signals={negative} />{missing.length ? <div><p className="mb-3 text-sm font-medium text-foreground">{t("insights.missingSignals")}</p><SignalBreakdown signals={missing} /></div> : null}</CardContent></Card>;
}


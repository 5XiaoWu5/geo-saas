"use client";

import { CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/i18n/provider";
import type { InsightSignal } from "../types";
import { SignalBreakdown } from "./SignalBreakdown";

export function PositiveSignals({ signals }: { signals: InsightSignal[] }) {
  const { t } = useI18n();
  return <Card className="glass-panel border-white/10"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><CheckCircle2 className="h-5 w-5 text-emerald-400" /> {t("insights.positiveSignals")}</CardTitle></CardHeader><CardContent><SignalBreakdown signals={signals} /></CardContent></Card>;
}


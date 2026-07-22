"use client";

import { CircleHelp } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useI18n } from "@/i18n/provider";

export type MetricHelpContent = { what: string; why: string; source: string; improve: string };

export function MetricHelp({ label, content }: { label: string; content: MetricHelpContent }) {
  const { t } = useI18n();
  return <TooltipProvider delayDuration={180}><Tooltip><TooltipTrigger asChild><button type="button" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-muted-foreground transition hover:bg-white/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label={`${label} help`}><CircleHelp className="h-4 w-4" /></button></TooltipTrigger><TooltipContent><p className="font-semibold">{label}</p><dl className="mt-3 grid gap-2 text-xs leading-5"><div><dt className="font-medium text-violet-200">{t("metrics.helpWhat")}</dt><dd className="text-slate-300">{content.what}</dd></div><div><dt className="font-medium text-violet-200">{t("metrics.helpWhy")}</dt><dd className="text-slate-300">{content.why}</dd></div><div><dt className="font-medium text-violet-200">{t("metrics.helpSource")}</dt><dd className="text-slate-300">{content.source}</dd></div><div><dt className="font-medium text-violet-200">{t("metrics.helpImprove")}</dt><dd className="text-slate-300">{content.improve}</dd></div></dl></TooltipContent></Tooltip></TooltipProvider>;
}

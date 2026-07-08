"use client";

import { Bot, CheckCircle2, XCircle } from "lucide-react";
import type { AIAnswerSimulation } from "@/features/geo-analyzer/types";
import { useI18n } from "@/i18n/provider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AIAnswerPreview({ simulations }: { simulations: AIAnswerSimulation[] }) {
  const { t } = useI18n();

  return (
    <Card className="glass-panel border-white/10">
      <CardHeader>
        <CardTitle>{t("analyzer.answerSimulation")}</CardTitle>
        <p className="text-sm text-muted-foreground">{t("analyzer.userQuestion")}: “{simulations[0]?.question}”</p>
      </CardHeader>
      <CardContent className="grid gap-4 xl:grid-cols-3">
        {simulations.map((simulation) => (
          <div key={simulation.engine} className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3"><div className="rounded-2xl bg-primary/10 p-2"><Bot className="h-5 w-5 text-primary" /></div><h3 className="font-semibold">{simulation.engine}</h3></div>
              <Badge variant={simulation.recommended ? "success" : "outline"}>{simulation.recommended ? t("analyzer.recommended") : t("analyzer.notRecommended")}</Badge>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">{simulation.answer}</p>
            <ReasonList title={simulation.recommended ? t("analyzer.recommendedReason") : t("analyzer.notRecommendedReason")} items={simulation.recommended ? simulation.reasons : simulation.missingReasons} positive={simulation.recommended} />
            <ReasonList title={t("analyzer.recommendations")} items={simulation.recommendations} positive />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ReasonList({ title, items, positive }: { title: string; items: string[]; positive: boolean }) {
  const Icon = positive ? CheckCircle2 : XCircle;

  return (
    <div className="mt-5">
      <p className="text-sm font-medium">{title}</p>
      <div className="mt-2 space-y-2">
        {items.map((item) => <div key={item} className="flex gap-2 text-sm text-muted-foreground"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{item}</div>)}
      </div>
    </div>
  );
}

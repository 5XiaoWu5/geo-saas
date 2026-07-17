"use client";

import { BrainCircuit, Sparkles } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { GeoBrainAnalysis } from "@/features/geo-brain/types";

export function GeoBrainScoreCard({ analysis }: { analysis: GeoBrainAnalysis | null }) {
  const { t } = useI18n();

  return (
    <Card className="glass-panel border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BrainCircuit className="h-5 w-5 text-primary" /> {t("geoBrain.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!analysis ? (
          <p className="text-sm text-muted-foreground">{t("geoBrain.description")}</p>
        ) : (
          <>
            <div className="rounded-3xl border border-primary/20 bg-primary/[0.06] p-5">
              <p className="text-sm text-muted-foreground">{t("geoBrain.geoScore")}</p>
              <p className="mt-2 text-5xl font-semibold tracking-tight text-primary">{analysis.score}</p>
              <Progress value={analysis.score} className="mt-4" />
            </div>

            <section className="grid gap-3 sm:grid-cols-2">
              <BrainMetric label={t("geoBrain.entityAuthority")} value={analysis.scoreDetails.entityScore} />
              <BrainMetric label={t("geoBrain.contentStructure")} value={analysis.scoreDetails.contentScore} />
              <BrainMetric label={t("geoBrain.schemaCoverage")} value={analysis.scoreDetails.schemaScore} />
              <BrainMetric label={t("geoBrain.authoritySignal")} value={analysis.scoreDetails.authorityScore} />
            </section>

            <BrainMetric label={t("geoBrain.citationPotential")} value={analysis.scoreDetails.citationScore} />

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                {t("geoBrain.aiSummary")}
              </div>
              <p className="mt-2 break-words text-sm text-foreground">{analysis.aiSummary || t("geoBrain.notConfigured")}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="outline">{t("geoBrain.provider")}: {analysis.provider}</Badge>
                <Badge variant="outline">{t("geoBrain.model")}: {analysis.model}</Badge>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function BrainMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">{value}</span>
      </div>
      <Progress value={value} className="mt-3" />
    </div>
  );
}

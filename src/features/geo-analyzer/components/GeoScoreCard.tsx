"use client";

import type { GeoScoreAnalysis } from "@/features/geo-analyzer/types";
import { useI18n } from "@/i18n/provider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

function getLevelLabel(level: GeoScoreAnalysis["level"]) {
  const labels: Record<GeoScoreAnalysis["level"], string> = {
    Excellent: "优秀",
    Good: "良好",
    "Need Improvement": "需要改进",
  };

  return labels[level];
}

const factorKeys = {
  entityCompleteness: "analyzer.entityCompleteness",
  contentQuality: "analyzer.contentQuality",
  websiteStructure: "analyzer.websiteStructure",
  trustSignals: "analyzer.trustSignals",
  citationPotential: "analyzer.citationPotential",
};

export function GeoScoreCard({ analysis }: { analysis: GeoScoreAnalysis }) {
  const { t } = useI18n();

  return (
    <Card className="glass-panel border-primary/20">
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{t("analyzer.scoreTitle")}</CardTitle>
          <p className="mt-2 text-sm text-muted-foreground">{t("analyzer.sourceInventory")}</p>
        </div>
        <Badge variant={analysis.level === "Excellent" ? "success" : analysis.level === "Good" ? "warning" : "outline"}>{getLevelLabel(analysis.level)}</Badge>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 xl:grid-cols-[260px_1fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-center">
            <p className="text-6xl font-semibold tracking-tight text-primary">{analysis.score}</p>
            <p className="mt-2 text-sm text-muted-foreground">0-100</p>
            <Progress value={analysis.score} className="mt-5 h-3" />
          </div>
          <div className="grid gap-3">
            {analysis.factors.map((factor) => (
              <div key={factor.key} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="mb-2 flex items-center justify-between text-sm"><span>{t(factorKeys[factor.key])}</span><span className="font-semibold text-primary">{factor.score}</span></div>
                <Progress value={factor.score} />
              </div>
            ))}
          </div>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <InsightList title={t("analyzer.strengths")} items={analysis.strengths} />
          <InsightList title={t("analyzer.issues")} items={analysis.issues} />
          <InsightList title={t("analyzer.recommendations")} items={analysis.recommendations} />
        </div>
      </CardContent>
    </Card>
  );
}

function InsightList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <h3 className="font-medium">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
        {items.map((item) => <li key={item}>• {item}</li>)}
      </ul>
    </div>
  );
}

"use client";

import { Globe2 } from "lucide-react";
import type { CompetitorVisibility } from "@/features/visibility-monitor/types";
import { useI18n } from "@/i18n/provider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function CompetitorCompare({ competitors }: { competitors: CompetitorVisibility[] }) {
  const { t } = useI18n();

  return (
    <Card className="glass-panel border-white/10">
      <CardHeader>
        <CardTitle>{t("visibility.competitorCompare")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {competitors.toSorted((left, right) => right.recommendationProbability - left.recommendationProbability).map((competitor) => (
          <div key={competitor.website} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-primary/10 p-2"><Globe2 className="h-4 w-4 text-primary" /></div>
                <div>
                  <div className="flex items-center gap-2"><p className="font-medium">{competitor.name}</p>{competitor.isOwnSite ? <Badge variant="success">{t("visibility.ownSite")}</Badge> : <Badge variant="muted">{t("visibility.competitorSite")}</Badge>}</div>
                  <p className="text-xs text-muted-foreground">{competitor.website}</p>
                </div>
              </div>
              <div className="w-full md:w-64">
                <div className="mb-2 flex justify-between text-sm"><span>{t("visibility.recommendationProbability")}</span><span className="font-semibold text-primary">{competitor.recommendationProbability}%</span></div>
                <Progress value={competitor.recommendationProbability} />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

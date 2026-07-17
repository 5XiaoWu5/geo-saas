"use client";

import { LineChart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/i18n/provider";
import type { VisibilityTrendPoint } from "@/features/visibility/types";

export function GrowthChart({ trend }: { trend: VisibilityTrendPoint[] }) {
  const { t } = useI18n();

  return (
    <Card className="glass-panel border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <LineChart className="h-5 w-5 text-primary" /> {t("campaigns.growthTrend")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {trend.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-muted-foreground">{t("campaigns.noTrend")}</p>
        ) : (
          <div className="space-y-4">
            {trend.slice(-10).map((point) => {
              const competitionChange = Math.max(0, 100 - point.brandMentionRate);
              return (
                <div key={point.date} className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:grid-cols-[120px_1fr]">
                  <div>
                    <p className="text-sm font-medium text-foreground">{point.date}</p>
                    <p className="text-xs text-muted-foreground">{point.totalChecks} {t("campaigns.checks")}</p>
                  </div>
                  <div className="space-y-2">
                    <ChartBar label={t("campaigns.aiAppearanceProbability")} value={point.brandMentionRate} />
                    <ChartBar label={`${t("campaigns.brandMentions")} ${point.brandMentions}`} value={Math.min(100, point.brandMentions * 20)} />
                    <ChartBar label={t("campaigns.competitionChange")} value={competitionChange} muted />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ChartBar({ label, value, muted = false }: { label: string; value: number; muted?: boolean }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>{Math.round(value)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full ${muted ? "bg-muted-foreground/40" : "bg-primary"}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}


"use client";

import { BarChart3, CheckCircle2, LineChart, Radar, Target } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useI18n } from "@/i18n/provider";
import type { GeoCampaignSummary, GeoCampaignWithRelations } from "../types";

type Props = {
  summary: GeoCampaignSummary;
  activeCampaign?: GeoCampaignWithRelations | null;
};

function formatRank(value: number | null) {
  return value ? String(value) : "-";
}

function formatDelta(value: number) {
  if (value > 0) return `+${value}%`;
  if (value < 0) return `${value}%`;
  return "0%";
}

export function CampaignOverview({ summary, activeCampaign }: Props) {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<Target className="h-5 w-5" />} label={t("campaigns.campaignCount")} value={String(summary.totalCampaigns)} description={t("campaigns.activeTasks")} />
        <MetricCard icon={<CheckCircle2 className="h-5 w-5" />} label={t("campaigns.monitoringQueries")} value={String(summary.totalQueries)} description={`${summary.queryCoverage}% ${t("campaigns.coverage")}`} />
        <MetricCard icon={<Radar className="h-5 w-5" />} label={t("campaigns.aiExposureRate")} value={`${summary.aiExposureRate}%`} description={`${summary.brandMentions} ${t("campaigns.brandMentions")}`} />
        <MetricCard icon={<LineChart className="h-5 w-5" />} label={t("campaigns.averageRank")} value={formatRank(summary.averageMentionPosition)} description={`${t("campaigns.growth")}: ${formatDelta(summary.growthDelta)}`} />
      </section>

      {activeCampaign ? (
        <Card className="glass-panel border-white/10">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5 text-primary" /> {activeCampaign.name}
                <Badge variant={activeCampaign.status === "ACTIVE" ? "success" : "muted"}>{t(`campaigns.status.${activeCampaign.status}`)}</Badge>
              </CardTitle>
              <p className="mt-2 text-sm text-muted-foreground">{activeCampaign.industry}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {activeCampaign.platforms.map((platform) => <Badge key={platform} variant="outline">{platform}</Badge>)}
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <ProgressTile label={t("campaigns.queryCoverage")} value={activeCampaign.score.queryCoverage} />
            <ProgressTile label={t("campaigns.aiExposureRate")} value={activeCampaign.score.visibilityRate} />
            <ProgressTile label={t("campaigns.monitoringCoverage")} value={activeCampaign.score.monitoringCoverage} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function MetricCard({ icon, label, value, description }: { icon: ReactNode; label: string; value: string; description: string }) {
  return (
    <Card className="glass-panel border-white/10">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
        <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function ProgressTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold text-primary">{value}%</span>
      </div>
      <Progress value={value} />
    </div>
  );
}

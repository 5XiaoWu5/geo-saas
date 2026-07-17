"use client";

import { FileSearch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useI18n } from "@/i18n/provider";
import type { GeoCampaignCluster, GeoQuery } from "../types";

type Props = {
  clusters: GeoCampaignCluster[];
  queries: GeoQuery[];
};

function priorityVariant(priority: GeoQuery["priority"]) {
  if (priority === "high") return "success";
  if (priority === "medium") return "warning";
  return "muted";
}

export function QueryClusterTable({ clusters, queries }: Props) {
  const { t } = useI18n();

  return (
    <Card className="glass-panel border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileSearch className="h-5 w-5 text-primary" /> {t("campaigns.queryCluster")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {clusters.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-muted-foreground">{t("campaigns.noQueries")}</p>
        ) : (
          clusters.map((cluster) => {
            const clusterQueries = queries.filter((query) => query.category === cluster.category);
            return (
              <section key={cluster.category} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{t(`campaigns.categories.${cluster.category}`)}</Badge>
                      <span className="text-sm font-medium text-foreground">{cluster.queryCount} {t("campaigns.queries")}</span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{cluster.intent}</p>
                  </div>
                  <div className="w-full sm:w-48">
                    <div className="mb-2 flex justify-between text-xs text-muted-foreground">
                      <span>{t("campaigns.clusterCoverage")}</span>
                      <span>{cluster.queryCoverage}%</span>
                    </div>
                    <Progress value={cluster.queryCoverage} />
                  </div>
                </div>
                <div className="mt-4 max-h-[420px] space-y-2 overflow-y-auto pr-1">
                  {clusterQueries.map((query) => (
                    <div key={query.id} className="rounded-xl border border-white/10 bg-background/35 p-3">
                      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                        <p className="min-w-0 break-words text-sm font-medium text-foreground">{query.query}</p>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <Badge variant={priorityVariant(query.priority)}>{t(`campaigns.priority.${query.priority}`)}</Badge>
                          <Badge variant="outline">{t(`campaigns.queryStatus.${query.status}`)}</Badge>
                        </div>
                      </div>
                      <p className="mt-2 break-words text-xs text-muted-foreground">{query.intent}</p>
                    </div>
                  ))}
                </div>
              </section>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}


"use client";

import { FileSearch, Image, Link2, Route, Share2, SquareStack } from "lucide-react";
import type { CrawlJob } from "@/types/crawl";
import { useI18n } from "@/i18n/provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatDateTime } from "@/lib/format";

const statItems = [
  { key: "pagesFound", labelKey: "crawl.pagesFound", icon: FileSearch },
  { key: "assetsFound", labelKey: "crawl.assetsFound", icon: SquareStack },
  { key: "images", labelKey: "crawl.images", icon: Image },
  { key: "internalLinks", labelKey: "crawl.internalLinks", icon: Link2 },
  { key: "externalLinks", labelKey: "crawl.externalLinks", icon: Share2 },
] as const;

export function CrawlProgress({ job }: { job: CrawlJob }) {
  const { t } = useI18n();

  return (
    <Card className="glass-panel border-white/10">
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{t("crawl.progress")}</CardTitle>
          <p className="mt-2 text-sm text-muted-foreground">{job.status === "Completed" ? `${t("crawl.completed")} ${formatDateTime(job.completedAt)}` : `${t("crawl.currentState")}: ${job.status}`}</p>
        </div>
        <div className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-2 text-right">
          <p className="text-2xl font-semibold text-primary">{job.progress}%</p>
          <p className="text-xs text-muted-foreground">{t("crawl.progress")}</p>
        </div>
      </CardHeader>
      <CardContent>
        <Progress value={job.progress} className="h-3" />
        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <Route className="h-5 w-5 text-primary" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{t("crawl.currentPage")}</p>
            <p className="truncate font-medium">{job.currentPage}</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {statItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.key} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <Icon className="h-4 w-4 text-primary" />
                <p className="mt-3 text-2xl font-semibold">{job[item.key].toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{t(item.labelKey)}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

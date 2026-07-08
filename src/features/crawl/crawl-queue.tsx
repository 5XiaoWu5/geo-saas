"use client";

import { CheckCircle2, Clock3, Loader2, XCircle } from "lucide-react";
import type { CrawlJob, CrawlStatus } from "@/types/crawl";
import { useI18n } from "@/i18n/provider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatDateTime, getHostname } from "@/lib/format";

const statusMeta: Record<CrawlStatus, { icon: typeof Clock3; variant: "success" | "warning" | "muted" | "outline" }> = {
  Waiting: { icon: Clock3, variant: "muted" },
  Running: { icon: Loader2, variant: "warning" },
  Completed: { icon: CheckCircle2, variant: "success" },
  Failed: { icon: XCircle, variant: "outline" },
};

export function CrawlQueue({ jobs, selectedJobId, onSelectJob }: { jobs: CrawlJob[]; selectedJobId: string; onSelectJob: (job: CrawlJob) => void }) {
  const { t } = useI18n();

  return (
    <Card className="glass-panel border-white/10">
      <CardHeader>
        <CardTitle>{t("crawl.queue")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {jobs.map((job) => {
          const meta = statusMeta[job.status];
          const Icon = meta.icon;
          const active = job.id === selectedJobId;

          return (
            <button key={job.id} type="button" onClick={() => onSelectJob(job)} className={`w-full rounded-2xl border p-4 text-left transition hover:bg-white/[0.05] ${active ? "border-primary/40 bg-primary/10" : "border-white/10 bg-white/[0.03]"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{getHostname(job.websiteUrl)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{t("crawl.started")} {formatDateTime(job.startedAt)}</p>
                </div>
                <Badge variant={meta.variant}><Icon className="mr-1 h-3 w-3" />{job.status}</Badge>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <Progress value={job.progress} />
                <span className="w-10 text-right text-xs text-muted-foreground">{job.progress}%</span>
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}

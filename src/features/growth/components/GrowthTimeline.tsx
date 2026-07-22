import { Building2, CheckCircle2, Eye, FlaskConical, ScanSearch, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/i18n/provider";
import { formatDateTime } from "@/lib/format";
import type { GrowthEventType, GrowthSnapshot } from "../types";

const ICONS = { SCAN: ScanSearch, ENTITY: Building2, SIMULATION: FlaskConical, VISIBILITY: Eye, OPTIMIZATION: CheckCircle2, AI_SEARCH: Sparkles } satisfies Record<GrowthEventType, typeof ScanSearch>;

export function GrowthTimeline({ snapshots }: { snapshots: GrowthSnapshot[] }) {
  const { t } = useI18n();
  const sorted = [...snapshots].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  return (
    <Card className="glass-panel min-w-0 border-white/10">
      <CardHeader><CardTitle className="text-lg">{t("growth.timeline")}</CardTitle></CardHeader>
      <CardContent>
        {sorted.length === 0 ? <p className="text-sm text-muted-foreground">{t("growth.noSnapshots")}</p> : (
          <div className="relative space-y-4 before:absolute before:bottom-5 before:left-5 before:top-5 before:w-px before:bg-white/10">
            {sorted.map((snapshot) => <TimelineItem key={snapshot.id} snapshot={snapshot} />)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TimelineItem({ snapshot }: { snapshot: GrowthSnapshot }) {
  const { t } = useI18n();
  const Icon = ICONS[snapshot.eventType];
  return (
    <div className="relative flex min-w-0 items-start gap-3">
      <div className="z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-background text-primary"><Icon className="h-4 w-4" /></div>
      <div className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0"><p className="font-medium text-foreground">{t(`growth.events.${snapshot.eventType}`)}</p><p className="mt-1 text-xs text-muted-foreground">{formatDateTime(snapshot.createdAt)}</p></div>
          <Badge variant="outline">{t(`growth.triggers.${snapshot.triggerType}`)}</Badge>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
          {snapshot.overallScore !== null ? <span>{t("growth.metrics.overallScore")}: <strong className="font-mono text-foreground">{snapshot.overallScore}</strong></span> : null}
          {snapshot.visibilityScore !== null ? <span>{t("growth.metrics.visibilityScore")}: <strong className="font-mono text-foreground">{snapshot.visibilityScore}</strong></span> : null}
          {snapshot.entityScore !== null ? <span>{t("growth.metrics.entityScore")}: <strong className="font-mono text-foreground">{snapshot.entityScore}</strong></span> : null}
        </div>
      </div>
    </div>
  );
}

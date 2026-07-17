import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/i18n/provider";
import { formatDateTime } from "@/lib/format";
import type { GrowthSnapshot } from "../types";

export function MetricHistory({ snapshots }: { snapshots: GrowthSnapshot[] }) {
  const { t } = useI18n();
  const records = [...snapshots].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  return (
    <Card className="glass-panel min-w-0 border-white/10">
      <CardHeader><CardTitle className="text-lg">{t("growth.metricHistory")}</CardTitle></CardHeader>
      <CardContent>
        {records.length === 0 ? <p className="text-sm text-muted-foreground">{t("growth.noSnapshots")}</p> : <>
          <div className="hidden overflow-hidden rounded-xl border border-white/10 lg:block"><table className="w-full table-fixed text-left text-sm"><thead className="bg-white/[0.04] text-xs text-muted-foreground"><tr><th className="w-[22%] p-3">{t("growth.time")}</th><th className="w-[18%] p-3">{t("growth.event")}</th><th className="p-3">{t("growth.metrics.overallScore")}</th><th className="p-3">{t("growth.metrics.visibilityScore")}</th><th className="p-3">{t("growth.metrics.entityScore")}</th><th className="p-3">{t("growth.metrics.schemaScore")}</th><th className="p-3">{t("growth.metrics.authorityScore")}</th></tr></thead><tbody>{records.map((snapshot) => <tr key={snapshot.id} className="border-t border-white/10"><td className="p-3 text-xs text-muted-foreground">{formatDateTime(snapshot.createdAt)}</td><td className="p-3">{t(`growth.events.${snapshot.eventType}`)}</td>{[snapshot.overallScore, snapshot.visibilityScore, snapshot.entityScore, snapshot.schemaScore, snapshot.authorityScore].map((value, index) => <td key={index} className="p-3 font-mono">{value ?? "-"}</td>)}</tr>)}</tbody></table></div>
          <div className="grid gap-3 lg:hidden">{records.map((snapshot) => <div key={snapshot.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><div className="flex items-start justify-between gap-3"><p className="font-medium text-foreground">{t(`growth.events.${snapshot.eventType}`)}</p><span className="text-xs text-muted-foreground">{formatDateTime(snapshot.createdAt)}</span></div><div className="mt-3 grid grid-cols-2 gap-2 text-xs">{[["overallScore", snapshot.overallScore], ["visibilityScore", snapshot.visibilityScore], ["entityScore", snapshot.entityScore], ["schemaScore", snapshot.schemaScore]].map(([key, value]) => <div key={String(key)} className="rounded-lg border border-white/10 p-2"><p className="truncate text-muted-foreground">{t(`growth.metrics.${key}`)}</p><p className="mt-1 font-mono text-foreground">{value ?? "-"}</p></div>)}</div></div>)}</div>
        </>}
      </CardContent>
    </Card>
  );
}


import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/i18n/provider";
import { formatDateTime } from "@/lib/format";
import type { SimulationRecord } from "../types";

export function SimulationHistory({ records }: { records: SimulationRecord[] }) {
  const { t } = useI18n();
  return (
    <Card className="glass-panel min-w-0 border-white/10">
      <CardHeader><CardTitle className="text-lg">{t("simulator.history")}</CardTitle></CardHeader>
      <CardContent>
        {records.length === 0 ? <p className="text-sm text-muted-foreground">{t("simulator.noHistory")}</p> : (
          <>
            <div className="hidden overflow-hidden rounded-xl border border-white/10 md:block">
              <table className="w-full table-fixed text-left text-sm">
                <thead className="bg-white/[0.04] text-xs text-muted-foreground"><tr><th className="w-[22%] p-3">{t("simulator.time")}</th><th className="w-[18%] p-3">{t("simulator.provider")}</th><th className="w-[32%] p-3">{t("simulator.query")}</th><th className="w-[14%] p-3">{t("simulator.probability")}</th><th className="w-[14%] p-3">{t("simulator.trend")}</th></tr></thead>
                <tbody>{records.map((record) => <HistoryRow key={record.id} record={record} />)}</tbody>
              </table>
            </div>
            <div className="grid gap-3 md:hidden">{records.map((record) => <HistoryCard key={record.id} record={record} />)}</div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function HistoryRow({ record }: { record: SimulationRecord }) {
  return <tr className="border-t border-white/10"><td className="p-3 text-xs text-muted-foreground">{formatDateTime(record.createdAt)}</td><td className="p-3 font-medium">{record.provider}</td><td className="truncate p-3 text-muted-foreground">{record.query}</td><td className="p-3 font-mono">{record.result ? `${record.result.probability}%` : "-"}</td><td className="p-3"><Trend value={record.trend} /></td></tr>;
}

function HistoryCard({ record }: { record: SimulationRecord }) {
  return <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.03] p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-medium text-foreground">{record.provider}</p><p className="mt-1 break-words text-sm text-muted-foreground">{record.query}</p></div><Badge variant="outline">{record.result ? `${record.result.probability}%` : record.status}</Badge></div><div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground"><span>{formatDateTime(record.createdAt)}</span><Trend value={record.trend} /></div></div>;
}

function Trend({ value }: { value: number | null }) {
  if (value === null) return <span className="text-muted-foreground">-</span>;
  return <span className={value >= 0 ? "text-emerald-400" : "text-rose-400"}>{value >= 0 ? "+" : ""}{value}%</span>;
}


import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/i18n/provider";
import type { GrowthMetricKey, GrowthSnapshot } from "../types";

const SERIES: Array<{ key: GrowthMetricKey; color: string }> = [
  { key: "overallScore", color: "#22d3ee" },
  { key: "visibilityScore", color: "#34d399" },
  { key: "entityScore", color: "#fbbf24" },
  { key: "schemaScore", color: "#60a5fa" },
  { key: "authorityScore", color: "#fb7185" },
];

function pointsFor(snapshots: GrowthSnapshot[], key: GrowthMetricKey) {
  const available = snapshots.map((snapshot, index) => ({ index, value: snapshot[key] })).filter((item): item is { index: number; value: number } => typeof item.value === "number");
  const denominator = Math.max(1, snapshots.length - 1);
  return available.map((item) => `${24 + (item.index / denominator) * 552},${212 - (item.value / 100) * 176}`).join(" ");
}

export function TrendChart({ snapshots }: { snapshots: GrowthSnapshot[] }) {
  const { t } = useI18n();
  const sorted = [...snapshots].sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
  return (
    <Card className="glass-panel min-w-0 border-white/10">
      <CardHeader><CardTitle className="text-lg">{t("growth.trendChart")}</CardTitle></CardHeader>
      <CardContent>
        {sorted.length === 0 ? <p className="text-sm text-muted-foreground">{t("growth.noTrend")}</p> : (
          <>
            <div className="aspect-[16/7] w-full min-w-0 overflow-hidden rounded-xl border border-white/10 bg-background/30 p-2">
              <svg viewBox="0 0 600 240" preserveAspectRatio="none" className="h-full w-full" role="img" aria-label={t("growth.trendChart")}>
                {[0, 25, 50, 75, 100].map((value) => <g key={value}><line x1="24" x2="576" y1={212 - (value / 100) * 176} y2={212 - (value / 100) * 176} stroke="rgba(255,255,255,0.08)" /><text x="2" y={216 - (value / 100) * 176} fill="rgba(255,255,255,0.42)" fontSize="9">{value}</text></g>)}
                {SERIES.map((series) => {
                  const points = pointsFor(sorted, series.key);
                  return points ? <polyline key={series.key} points={points} fill="none" stroke={series.color} strokeWidth="3" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" /> : null;
                })}
              </svg>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">{SERIES.map((series) => <span key={series.key} className="flex items-center gap-2 text-xs text-muted-foreground"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: series.color }} />{t(`growth.metrics.${series.key}`)}</span>)}</div>
          </>
        )}
      </CardContent>
    </Card>
  );
}


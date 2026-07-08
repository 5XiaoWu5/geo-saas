"use client";

import type { GeoScoreHistoryPoint } from "@/features/monitoring/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function GeoScoreTrend({ history, title }: { history: GeoScoreHistoryPoint[]; title: string }) {
  const latest = history.at(-1);
  const first = history[0];
  const lift = latest && first ? latest.geoScore - first.geoScore : 0;

  return (
    <Card className="glass-panel border-white/10">
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{title}</CardTitle>
          <p className="mt-2 text-sm text-muted-foreground">{first?.recordedAt} → {latest?.recordedAt}</p>
        </div>
        <div className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-2 text-right">
          <p className="text-2xl font-semibold text-primary">+{lift}</p>
          <p className="text-xs text-muted-foreground">GEO</p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex h-64 items-end gap-3 rounded-2xl bg-white/[0.03] p-4">
          {history.map((point) => (
            <div key={point.id} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex w-full flex-col justify-end gap-1" style={{ height: "100%" }}>
                <div className="rounded-t-md bg-primary/30" style={{ height: `${point.entityScore * 0.45}%` }} />
                <div className="rounded-t-md bg-cyan-300/40" style={{ height: `${point.contentScore * 0.35}%` }} />
                <div className="rounded-t-md bg-violet-300/40" style={{ height: `${point.trustScore * 0.25}%` }} />
              </div>
              <span className="text-xs font-semibold text-primary">{point.geoScore}</span>
              <span className="text-[10px] text-muted-foreground">{point.recordedAt.slice(5)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

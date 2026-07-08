"use client";

import type { AIVisibilityHistoryPoint } from "@/features/monitoring/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function AIMentionTrend({ history, title, mentionedLabel, missingLabel }: { history: AIVisibilityHistoryPoint[]; title: string; mentionedLabel: string; missingLabel: string }) {
  const grouped = history.reduce<Record<string, { total: number; mentioned: number }>>((accumulator, item) => {
    const key = item.recordedAt;
    const current = accumulator[key] ?? { total: 0, mentioned: 0 };
    accumulator[key] = { total: current.total + 1, mentioned: current.mentioned + (item.mentioned ? 1 : 0) };
    return accumulator;
  }, {});

  const rows = Object.entries(grouped).map(([date, value]) => ({ date, rate: Math.round((value.mentioned / value.total) * 100), ...value }));

  return (
    <Card className="glass-panel border-white/10">
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {rows.map((row) => (
          <div key={row.date} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div><p className="font-medium">{row.date}</p><p className="text-xs text-muted-foreground">{row.mentioned}/{row.total} {mentionedLabel}</p></div>
              <Badge variant={row.rate >= 60 ? "success" : "warning"}>{row.rate}%</Badge>
            </div>
            <Progress value={row.rate} />
          </div>
        ))}
        <div className="grid gap-3 md:grid-cols-2">
          {history.slice(-4).map((item) => <div key={item.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm"><Badge variant="outline">{item.platform}</Badge><p className="mt-2 line-clamp-1">{item.prompt}</p><p className="mt-1 text-xs text-muted-foreground">{item.mentioned ? mentionedLabel : missingLabel} · {item.rankingPosition ?? "—"}</p></div>)}
        </div>
      </CardContent>
    </Card>
  );
}

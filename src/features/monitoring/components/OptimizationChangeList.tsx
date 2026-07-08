"use client";

import { ArrowUpRight } from "lucide-react";
import type { OptimizationChangePoint } from "@/features/monitoring/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function OptimizationChangeList({ changes, title }: { changes: OptimizationChangePoint[]; title: string }) {
  return (
    <Card className="glass-panel border-white/10">
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {changes.map((change) => {
          const lift = change.afterScore - change.beforeScore;
          return (
            <div key={change.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">{change.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{change.changedAt}</p>
                </div>
                <div className="flex items-center gap-2 text-primary"><ArrowUpRight className="h-4 w-4" />+{lift}</div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div><div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>Before</span><span>{change.beforeScore}</span></div><Progress value={change.beforeScore} /></div>
                <div><div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>After</span><span>{change.afterScore}</span></div><Progress value={change.afterScore} /></div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

import type { IssueTrend } from "@/features/monitoring/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function IssueTrendCard({ trends, title = "GEO Health Trend" }: { trends: IssueTrend[]; title?: string }) {
  const latest = trends.at(-1);
  const weeklyNew = trends.reduce((total, item) => total + item.newIssues, 0);
  const weeklyFixed = trends.reduce((total, item) => total + item.fixedIssues, 0);
  const weeklyRegressions = trends.reduce((total, item) => total + item.regressionIssues, 0);
  const peak = Math.max(...trends.flatMap((item) => [item.openIssues, item.fixedIssues, item.newIssues, item.regressionIssues]), 1);

  return (
    <Card className="glass-panel border-white/10">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <span className="text-xs text-muted-foreground">Last 7 days</span>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-4">
          <IssueMetric label="Open" value={latest?.openIssues ?? 0} tone="text-primary" />
          <IssueMetric label="New this week" value={weeklyNew} tone="text-amber-300" />
          <IssueMetric label="Fixed this week" value={weeklyFixed} tone="text-emerald-300" />
          <IssueMetric label="Regressions" value={weeklyRegressions} tone="text-rose-300" />
        </div>
        <div className="flex h-36 items-end gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          {trends.map((item) => (
            <div key={item.id} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex h-24 w-full items-end justify-center gap-1">
                <Bar value={item.newIssues} peak={peak} className="bg-amber-300/80" />
                <Bar value={item.fixedIssues} peak={peak} className="bg-emerald-300/80" />
                <Bar value={item.regressionIssues} peak={peak} className="bg-rose-300/80" />
              </div>
              <span className="text-[10px] text-muted-foreground">{item.date.slice(5)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function IssueMetric({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><p className="text-xs text-muted-foreground">{label}</p><p className={`mt-2 text-2xl font-semibold ${tone}`}>{value}</p></div>;
}

function Bar({ value, peak, className }: { value: number; peak: number; className: string }) {
  return <div className={`w-2 rounded-t-full ${className}`} style={{ height: `${Math.max(8, (value / peak) * 96)}px` }} />;
}

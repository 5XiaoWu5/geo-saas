"use client";

import { useEffect, useState } from "react";
import { Activity, Bot, CheckCircle2, FileText } from "lucide-react";
import { ProjectLoadingSkeleton } from "@/features/project-center/components/ProjectStates";
import { useProject } from "@/features/project-center/context/ProjectContext";
import type { ProjectActivity } from "@/features/project-center/data/project-activity";
import type { ProjectMetrics } from "@/features/project-center/data/project-metrics";
import { getProjectActivity, getProjectMetrics } from "@/features/project-center/services/project.service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/shared/page";
import { Progress } from "@/components/ui/progress";
import { formatDateTime } from "@/lib/format";

export function ProjectOverviewTab() {
  const { projectId } = useProject();
  const [metrics, setMetrics] = useState<ProjectMetrics | null>(null);
  const [activity, setActivity] = useState<ProjectActivity[]>([]);

  useEffect(() => {
    void Promise.all([getProjectMetrics(projectId), getProjectActivity(projectId)]).then(([nextMetrics, nextActivity]) => {
      setMetrics(nextMetrics);
      setActivity(nextActivity);
    });
  }, [projectId]);

  if (!metrics) return <ProjectLoadingSkeleton />;

  const scanActivity = activity.find((item) => item.type === "scan");
  const optimizationActivity = activity.find((item) => item.type === "optimization");
  const contentActivity = activity.find((item) => item.type === "content");

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <MetricCard label="Overall Health" value={`${metrics.overallHealth}`} delta="Project Health" />
        <MetricCard label="GEO Score" value={`${metrics.geoScore}`} delta="GEO" />
        <MetricCard label="Citation Score" value={`${metrics.citationScore}`} delta="Citation" />
        <MetricCard label="Entity Score" value={`${metrics.entityScore}`} delta="Entity" />
        <MetricCard label="Schema Score" value={`${metrics.schemaScore}`} delta="Schema" />
        <MetricCard label="Content Score" value={`${metrics.contentScore}`} delta="Content" />
      </section>
      <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <Card className="glass-panel border-white/10">
          <CardHeader><CardTitle>Health Trend</CardTitle></CardHeader>
          <CardContent>
            <div className="flex h-52 items-end gap-3 rounded-2xl bg-white/[0.03] p-4">
              {metrics.healthTrend.map((point) => <div key={point.date} className="flex flex-1 flex-col items-center gap-2"><div className="w-full rounded-t-lg bg-gradient-to-t from-primary/30 to-primary" style={{ height: `${point.score}%` }} /><span className="text-xs text-primary">{point.score}</span><span className="text-[10px] text-muted-foreground">{point.date}</span></div>)}
            </div>
          </CardContent>
        </Card>
        <Card className="glass-panel border-white/10">
          <CardHeader><CardTitle>Optimization Progress</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-3xl border border-primary/20 bg-primary/10 p-6 text-center"><p className="text-5xl font-semibold text-primary">{metrics.optimizationProgress}%</p><p className="mt-2 text-sm text-muted-foreground">Completed</p><Progress value={metrics.optimizationProgress} className="mt-5 h-3" /></div>
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-muted-foreground">{metrics.todoTasks} Tasks in progress</div>
          </CardContent>
        </Card>
      </section>
      <Card className="glass-panel border-white/10">
        <CardHeader><CardTitle>AI Search Performance</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <VisibilityRow label="ChatGPT Visibility" result={metrics.visibilityScore} position={2} />
          <VisibilityRow label="Gemini Visibility" result={Math.max(0, metrics.visibilityScore - 18)} />
          <VisibilityRow label="Perplexity Visibility" result={Math.max(0, metrics.visibilityScore - 7)} position={3} />
        </CardContent>
      </Card>
      <Card className="glass-panel border-white/10">
        <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <ActivityItem icon={<Activity className="h-4 w-4" />} title={scanActivity?.title ?? "最近扫描"} description={scanActivity?.createdAt ? formatDateTime(scanActivity.createdAt) : "—"} />
          <ActivityItem icon={<CheckCircle2 className="h-4 w-4" />} title={optimizationActivity?.title ?? "最近优化任务"} description={optimizationActivity?.description ?? "—"} />
          <ActivityItem icon={<FileText className="h-4 w-4" />} title={contentActivity?.title ?? "最近生成内容"} description={contentActivity?.description ?? "—"} />
        </CardContent>
      </Card>
    </div>
  );
}

function VisibilityRow({ label, result, position }: { label: string; result: number; position?: number | null }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><div className="mb-2 flex items-center justify-between"><div className="flex items-center gap-2"><Bot className="h-4 w-4 text-primary" />{label}</div><Badge variant={position ? "success" : "warning"}>{position ? `#${position}` : "Watch"}</Badge></div><Progress value={result} /></div>;
}

function ActivityItem({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><div className="flex items-center gap-2 text-primary">{icon}<span className="font-medium text-foreground">{title}</span></div><p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{description}</p></div>;
}


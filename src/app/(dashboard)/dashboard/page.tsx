"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import type { Project } from "@/types/project";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard, PageHeader } from "@/components/shared/page";
import { formatDate, getHostname } from "@/lib/format";

async function loadCurrentUserProjects() {
  const response = await fetch("/api/projects", { cache: "no-store" });
  const data = await response.json() as { projects?: Project[] };
  if (!response.ok) return [];
  return data.projects ?? [];
}

export default function DashboardPage() {
  const { t } = useI18n();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadCurrentUserProjects().then((data) => {
      setProjects(data);
      setLoading(false);
    });
  }, []);

  const stats = useMemo(() => {
    const totalReports = projects.reduce((total, project) => total + project.reportsCount, 0);
    const lastAnalysis = projects.map((project) => project.lastAnalysisAt).filter((value): value is string => Boolean(value)).sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] ?? null;
    const averageGeoScore = projects.length ? Math.round(projects.reduce((total, project) => total + project.geoScore, 0) / projects.length) : 0;
    const analyzedCount = projects.filter((project) => Boolean(project.lastScan)).length;
    return { totalReports, lastAnalysis, averageGeoScore, analyzedCount };
  }, [projects]);

  const rankedProjects = useMemo(() => [...projects].sort((left, right) => right.geoScore - left.geoScore), [projects]);

  return (
    <div>
      <PageHeader title={t("dashboard.title")} description={t("dashboard.description")} action={<Button asChild><Link href="/projects">{t("dashboard.newProject")}</Link></Button>} />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={t("dashboard.totalProjects")} value={String(projects.length)} delta="当前账号" />
        <MetricCard label="已分析项目" value={`${stats.analyzedCount} / ${projects.length}`} delta="完成首次扫描" />
        <MetricCard label={t("dashboard.lastAnalysis")} value={formatDate(stats.lastAnalysis)} delta={t("common.latest")} />
        <MetricCard label={t("dashboard.averageGeoScore")} value={`${stats.averageGeoScore}%`} delta="实时统计" />
      </section>
      <section className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <Card className="glass-panel border-white/10">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>项目 GEO 评分</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link href="/projects">{t("dashboard.viewProjects")} <ArrowUpRight className="h-4 w-4" /></Link></Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">正在加载...</p>
            ) : rankedProjects.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">当前账号暂无项目，先在项目页创建并运行一次分析。</p>
            ) : (
              <div className="flex h-64 items-end gap-3 overflow-x-auto rounded-2xl bg-white/[0.03] p-4">
                {rankedProjects.slice(0, 12).map((project) => (
                  <div key={project.id} className="flex min-w-10 flex-1 flex-col items-center gap-2">
                    <span className="text-[10px] font-medium text-primary">{project.geoScore}</span>
                    <div className="w-full rounded-t-lg bg-gradient-to-t from-primary/30 to-primary transition-all" style={{ height: `${Math.max(project.geoScore * 0.6, 2)}%` }} />
                    <span className="max-w-14 truncate text-[10px] text-muted-foreground">{project.name}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="glass-panel border-white/10">
          <CardHeader><CardTitle>{t("dashboard.recentProjects")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {projects.length === 0 ? <p className="text-sm text-muted-foreground">当前账号暂无项目。</p> : null}
            {projects.slice(0, 4).map((project) => <Link href={`/projects/${project.id}`} key={project.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-primary/30 hover:bg-white/[0.06]"><div className="min-w-0"><p className="truncate font-medium">{project.name}</p><p className="truncate text-xs text-muted-foreground">{getHostname(project.url)}</p></div><span className="ml-3 shrink-0 text-sm font-semibold text-primary">{project.geoScore}%</span></Link>)}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

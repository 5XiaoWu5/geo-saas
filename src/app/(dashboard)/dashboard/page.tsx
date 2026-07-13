"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { crawlDashboardStats } from "@/data/crawl";
import type { Project } from "@/types/project";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard, PageHeader } from "@/components/shared/page";
import { formatDate, formatDateTime, getHostname } from "@/lib/format";

const visibilitySeries = [72, 74, 70, 76, 81, 78, 84, 88, 86, 91, 89, 94];

async function loadCurrentUserProjects() {
  const response = await fetch("/api/projects", { cache: "no-store" });
  const data = await response.json() as { projects?: Project[] };
  if (!response.ok) return [];
  return data.projects ?? [];
}

export default function DashboardPage() {
  const { t } = useI18n();
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    void loadCurrentUserProjects().then(setProjects);
  }, []);

  const stats = useMemo(() => {
    const totalReports = projects.reduce((total, project) => total + project.reportsCount, 0);
    const lastAnalysis = projects.map((project) => project.lastAnalysisAt).filter((value): value is string => Boolean(value)).sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] ?? null;
    const averageGeoScore = projects.length ? Math.round(projects.reduce((total, project) => total + project.geoScore, 0) / projects.length) : 0;
    return { totalReports, lastAnalysis, averageGeoScore };
  }, [projects]);

  return (
    <div>
      <PageHeader title={t("dashboard.title")} description={t("dashboard.description")} action={<Button>{t("dashboard.newProject")}</Button>} />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={t("dashboard.totalProjects")} value={String(projects.length)} delta="当前账号" />
        <MetricCard label={t("dashboard.totalReports")} value={String(stats.totalReports)} delta={t("dashboard.allProjects")} />
        <MetricCard label={t("dashboard.lastAnalysis")} value={formatDate(stats.lastAnalysis)} delta={t("common.latest")} />
        <MetricCard label={t("dashboard.averageGeoScore")} value={`${stats.averageGeoScore}%`} delta="实时统计" />
      </section>
      <section className="mt-4 grid gap-4 md:grid-cols-3">
        <MetricCard label={t("dashboard.totalCrawledPages")} value={String(crawlDashboardStats.totalCrawledPages)} delta={t("dashboard.latestCrawl")} />
        <MetricCard label={t("dashboard.lastCrawlTime")} value={formatDateTime(crawlDashboardStats.lastCrawlTime)} delta={t("dashboard.mockCrawl")} />
        <MetricCard label={t("dashboard.pagesIndexed")} value={String(crawlDashboardStats.pagesIndexed)} delta={t("dashboard.fakeIndex")} />
      </section>
      <section className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <Card className="glass-panel border-white/10">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>{t("dashboard.trendTitle")}</CardTitle>
            <Button variant="ghost" size="sm">{t("dashboard.viewProjects")} <ArrowUpRight className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent>
            <div className="flex h-64 items-end gap-3 rounded-2xl bg-white/[0.03] p-4">
              {visibilitySeries.map((value, index) => <div key={index} className="flex flex-1 flex-col items-center gap-2"><div className="w-full rounded-t-lg bg-gradient-to-t from-primary/30 to-primary" style={{ height: `${value * 0.62}%` }} /><span className="text-[10px] text-muted-foreground">{index + 1}</span></div>)}
            </div>
          </CardContent>
        </Card>
        <Card className="glass-panel border-white/10">
          <CardHeader><CardTitle>{t("dashboard.recentProjects")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {projects.length === 0 ? <p className="text-sm text-muted-foreground">当前账号暂无项目。</p> : null}
            {projects.slice(0, 4).map((project) => <div key={project.name} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4"><div><p className="font-medium">{project.name}</p><p className="text-xs text-muted-foreground">{getHostname(project.url)}</p></div><span className="text-sm font-semibold text-primary">{project.geoScore}%</span></div>)}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

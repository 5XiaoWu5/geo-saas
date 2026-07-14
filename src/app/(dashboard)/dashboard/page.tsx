"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Target } from "lucide-react";
import type { Project } from "@/types/project";
import type { GeoAnalysis } from "@/features/geo-analysis/types";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { MetricCard, PageHeader } from "@/components/shared/page";
import { formatDate, formatDateTime, getHostname } from "@/lib/format";

async function loadCurrentUserProjects() {
  const response = await fetch("/api/projects", { cache: "no-store" });
  const data = await response.json() as { projects?: Project[] };
  if (!response.ok) return [];
  return data.projects ?? [];
}

async function loadLatestAnalysis(projectId: string) {
  const response = await fetch(`/api/projects/${projectId}/scan`, { cache: "no-store" });
  const data = await response.json() as { analysis?: GeoAnalysis | null };
  if (!response.ok) return null;
  return data.analysis ?? null;
}

export default function DashboardPage() {
  const { t } = useI18n();
  const [projects, setProjects] = useState<Project[]>([]);
  const [analysis, setAnalysis] = useState<GeoAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [featuredProject, setFeaturedProject] = useState<Project | null>(null);

  useEffect(() => {
    let mounted = true;
    void loadCurrentUserProjects().then(async (data) => {
      if (!mounted) return;
      setProjects(data);

      const analyzed = data
        .filter((project) => Boolean(project.lastAnalysisAt))
        .sort((left, right) => new Date(right.lastAnalysisAt ?? 0).getTime() - new Date(left.lastAnalysisAt ?? 0).getTime());
      const target = analyzed[0] ?? null;
      setFeaturedProject(target);

      if (target) {
        const latest = await loadLatestAnalysis(target.id);
        if (mounted) setAnalysis(latest);
      }
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const analyzedCount = projects.filter((project) => Boolean(project.lastScan)).length;
    const lastAnalysis = projects.map((project) => project.lastAnalysisAt).filter((value): value is string => Boolean(value)).sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] ?? null;
    const averageGeoScore = analyzedCount ? Math.round(projects.filter((project) => Boolean(project.lastScan)).reduce((total, project) => total + project.geoScore, 0) / analyzedCount) : 0;
    return { analyzedCount, lastAnalysis, averageGeoScore };
  }, [projects]);

  return (
    <div>
      <PageHeader title={t("dashboard.title")} description={t("dashboard.description")} action={<Button asChild><Link href="/projects">{t("dashboard.newProject")}</Link></Button>} />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={t("dashboard.totalProjects")} value={String(projects.length)} delta="当前账号" />
        <MetricCard label="已分析项目" value={`${stats.analyzedCount} / ${projects.length}`} delta="完成首次扫描" />
        <MetricCard label={t("dashboard.lastAnalysis")} value={formatDate(stats.lastAnalysis)} delta={t("common.latest")} />
        <MetricCard label={t("dashboard.averageGeoScore")} value={stats.analyzedCount ? `${stats.averageGeoScore}%` : "—"} delta="已分析项目均值" />
      </section>
      <section className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <Card className="glass-panel border-white/10">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-primary" /> 最新 GEO 分析</CardTitle>
            {featuredProject ? <Button asChild variant="ghost" size="sm"><Link href={`/projects/${featuredProject.id}`}>查看详情 <ArrowUpRight className="h-4 w-4" /></Link></Button> : null}
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="py-12 text-center text-sm text-muted-foreground">正在加载...</p>
            ) : !featuredProject || !analysis ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-6 text-center">
                <p className="text-sm font-medium text-foreground">暂无 GEO 分析数据</p>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">创建项目并在项目详情页运行一次「开始分析」，这里会展示真实的 GEO 评分与分类得分。</p>
                <Button asChild className="mt-5"><Link href="/projects">前往项目</Link></Button>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-col gap-4 rounded-2xl border border-primary/20 bg-primary/[0.05] p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-muted-foreground">{featuredProject.name} · {getHostname(featuredProject.url)}</p>
                    <p className="mt-1 text-5xl font-semibold tracking-tight text-foreground">{analysis.totalScore}<span className="ml-1 text-lg text-muted-foreground">/100</span></p>
                  </div>
                  <div className="w-full max-w-[220px] shrink-0">
                    <Progress value={analysis.totalScore} />
                    <p className="mt-2 text-xs text-muted-foreground">分析时间：{formatDateTime(analysis.createdAt)}</p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <CategoryScore label="实体智能" value={analysis.entityScore} max={30} />
                  <CategoryScore label="结构化数据" value={analysis.schemaScore} max={25} />
                  <CategoryScore label="技术 GEO" value={analysis.technicalScore} max={25} />
                  <CategoryScore label="内容结构" value={analysis.contentScore} max={20} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="glass-panel border-white/10">
          <CardHeader><CardTitle>{t("dashboard.recentProjects")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {!loading && projects.length === 0 ? <p className="text-sm text-muted-foreground">当前账号暂无项目。</p> : null}
            {projects.slice(0, 5).map((project) => <Link href={`/projects/${project.id}`} key={project.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-primary/30 hover:bg-white/[0.06]"><div className="min-w-0"><p className="truncate font-medium">{project.name}</p><p className="truncate text-xs text-muted-foreground">{getHostname(project.url)}</p></div><span className="ml-3 shrink-0 text-sm font-semibold text-primary">{project.lastScan ? `${project.geoScore}%` : "待分析"}</span></Link>)}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function CategoryScore({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{label}</span>
        <span>{value}/{max}</span>
      </div>
      <Progress value={(value / max) * 100} className="mt-3" />
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Building2, Loader2, Swords } from "lucide-react";
import { PageHeader } from "@/components/shared/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { CompetitorWorkspaceResponse } from "@/features/competitor-benchmark/types";

type ProjectSummary = { id: string; name: string; websiteUrl: string };
type ProjectCompetitors = ProjectSummary & { competitorCount: number };

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  const data = text ? JSON.parse(text) as T & { error?: string } : {} as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "请求失败");
  return data;
}

export function CompetitorCenter() {
  const [projects, setProjects] = useState<ProjectCompetitors[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const projectData = await fetch("/api/projects", { cache: "no-store" }).then(readJson<{ projects: ProjectSummary[] }>);
        const rows = await Promise.all(projectData.projects.map(async (project) => {
          const result = await fetch(`/api/competitors?projectId=${encodeURIComponent(project.id)}`, { cache: "no-store" }).then(readJson<CompetitorWorkspaceResponse>);
          return { ...project, competitorCount: result.competitors.length };
        }));
        if (active) setProjects(rows);
      } catch (requestError) {
        if (active) setError(requestError instanceof Error ? requestError.message : "竞品数据加载失败");
      }
    })();
    return () => { active = false; };
  }, []);

  return <div className="min-w-0 space-y-6 overflow-x-hidden"><PageHeader title="竞品管理" description="按企业项目隔离管理竞品资产，并进入项目工作区查看 Benchmark 基础与差距。" />{error ? <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div> : !projects ? <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />正在加载竞品资产…</div> : projects.length ? <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{projects.map((project) => <Card key={project.id} className="glass-panel min-w-0 border-white/10"><CardContent className="flex h-full flex-col p-5"><div className="flex items-start justify-between gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/10 text-amber-300"><Swords className="h-5 w-5" /></span><Badge variant={project.competitorCount ? "success" : "muted"}>{project.competitorCount} 家竞品</Badge></div><h2 className="mt-4 truncate text-lg font-semibold">{project.name}</h2><p className="mt-2 truncate text-sm text-muted-foreground">{project.websiteUrl}</p><Button asChild variant="outline" className="mt-5 min-h-11 w-full"><Link href={`/projects/${project.id}/competitors`}>进入竞品管理 <ArrowRight className="h-4 w-4" /></Link></Button></CardContent></Card>)}</section> : <Card className="glass-panel border-white/10"><CardContent className="p-8 text-center"><Building2 className="mx-auto h-8 w-8 text-primary" /><h2 className="mt-4 text-lg font-semibold">还没有企业项目</h2><p className="mt-2 text-sm text-muted-foreground">创建项目后即可为每个企业独立管理竞品。</p><Button asChild className="mt-5 min-h-11"><Link href="/projects">创建项目</Link></Button></CardContent></Card>}</div>;
}

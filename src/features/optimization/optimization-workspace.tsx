"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertCircle, ArrowRight, CheckCircle2, ClipboardList, Loader2, Plus, Target } from "lucide-react";
import { PageHeader } from "@/components/shared/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GeoIssue } from "@/features/geo-analysis/types";
import type { KnowledgeAssessment } from "@/features/knowledge/types";
import type { BenchmarkOverviewResponse } from "@/features/competitor-benchmark/types";
import { buildGrowthOpportunities, toGrowthOpportunityTaskInput } from "@/features/growth-engine/opportunities";
import type { GrowthOpportunity, GrowthOpportunityDimension } from "@/features/growth-engine/types";
import { getOptimizationSeverityLabel, getOptimizationStatusLabel, OPTIMIZATION_STATUSES, type OptimizationSeverity, type OptimizationStatus, type OptimizationTask } from "@/features/optimization/types";
import { formatDateTime } from "@/lib/format";

type ProjectSummary = { id: string; name: string; websiteUrl: string };
type OptimizationData = { tasks: OptimizationTask[]; issues: GeoIssue[]; trackedIssueIds: string[]; analysisAt: string | null; error?: string };
type WorkspaceData = { optimization: OptimizationData; assessment: KnowledgeAssessment; benchmark: BenchmarkOverviewResponse };
type OpportunityFilter = "ALL" | GrowthOpportunityDimension;

const filters: Array<{ key: OpportunityFilter; label: string }> = [
  { key: "ALL", label: "全部" },
  { key: "SEO", label: "SEO 优化" },
  { key: "GEO", label: "GEO 优化" },
  { key: "KNOWLEDGE", label: "知识优化" },
  { key: "COMPETITIVE", label: "竞争优化" },
];

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  const data = text ? JSON.parse(text) as T & { error?: string } : {} as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "请求失败");
  return data;
}

export function OptimizationWorkspace({ initialProjectId, initialIssueId }: { initialProjectId?: string; initialIssueId?: string }) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [projectId, setProjectId] = useState(initialProjectId ?? "");
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [filter, setFilter] = useState<OpportunityFilter>("ALL");
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [busyOpportunityId, setBusyOpportunityId] = useState("");
  const [busyTaskId, setBusyTaskId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await fetch("/api/projects", { cache: "no-store" });
        const result = await readJson<{ projects: ProjectSummary[] }>(response);
        if (!active) return;
        setProjects(result.projects);
        setProjectId((current) => current || result.projects[0]?.id || "");
      } catch (requestError) {
        if (active) setError(requestError instanceof Error ? requestError.message : "项目加载失败");
      } finally {
        if (active) setLoadingProjects(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const loadData = useCallback(async (id: string) => {
    if (!id) return;
    setLoadingData(true);
    setError("");
    try {
      const [optimization, assessment, benchmark] = await Promise.all([
        fetch(`/api/projects/${id}/optimization`, { cache: "no-store" }).then(readJson<OptimizationData>),
        fetch(`/api/knowledge/${id}/assessment`, { cache: "no-store" }).then(readJson<KnowledgeAssessment>),
        fetch(`/api/benchmark?projectId=${encodeURIComponent(id)}`, { cache: "no-store" }).then(readJson<BenchmarkOverviewResponse>),
      ]);
      setData({ optimization, assessment, benchmark });
    } catch (requestError) {
      setData(null);
      setError(requestError instanceof Error ? requestError.message : "优化数据加载失败");
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => { if (projectId) void loadData(projectId); }, [projectId, loadData]);

  const opportunities = useMemo(() => data ? buildGrowthOpportunities({
    projectId,
    analysisIssues: data.optimization.issues,
    knowledgeGaps: data.assessment.missing,
    benchmarkGaps: data.benchmark.gaps,
    trackedTasks: data.optimization.tasks,
  }) : [], [data, projectId]);
  const visibleOpportunities = filter === "ALL" ? opportunities : opportunities.filter((opportunity) => opportunity.dimension === filter);
  const tasks = useMemo(() => data?.optimization.tasks ?? [], [data]);
  const stats = {
    total: tasks.length,
    pending: tasks.filter((task) => task.status === "PENDING").length,
    processing: tasks.filter((task) => task.status === "PROCESSING").length,
    completed: tasks.filter((task) => task.status === "COMPLETED").length,
  };

  useEffect(() => {
    if (!initialIssueId || !tasks.some((task) => task.issueId === initialIssueId)) return;
    const task = tasks.find((item) => item.issueId === initialIssueId);
    const frame = requestAnimationFrame(() => document.getElementById(`optimization-task-${task?.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
    return () => cancelAnimationFrame(frame);
  }, [initialIssueId, tasks]);

  async function createTask(opportunity: GrowthOpportunity) {
    setBusyOpportunityId(opportunity.id);
    setError("");
    try {
      await readJson<{ task: OptimizationTask }>(await fetch(`/api/projects/${projectId}/optimization`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunity: toGrowthOpportunityTaskInput(opportunity) }),
      }));
      await loadData(projectId);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "创建优化任务失败");
    } finally {
      setBusyOpportunityId("");
    }
  }

  async function updateStatus(taskId: string, status: OptimizationStatus) {
    setBusyTaskId(taskId);
    setError("");
    try {
      await readJson<{ task: OptimizationTask }>(await fetch(`/api/projects/${projectId}/optimization/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }));
      await loadData(projectId);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "更新任务状态失败");
    } finally {
      setBusyTaskId("");
    }
  }

  if (loadingProjects) return <LoadingState label="正在加载企业项目…" />;

  if (!projects.length) {
    return <div><PageHeader title="优化中心" description="统一执行 SEO、GEO、知识与竞争优化任务。" /><Card className="glass-panel border-white/10"><CardContent className="p-8 text-center"><ClipboardList className="mx-auto h-8 w-8 text-primary" /><h2 className="mt-4 text-lg font-semibold">还没有可优化的项目</h2><p className="mt-2 text-sm text-muted-foreground">创建项目并完成首次网站分析后，增长机会会进入这里。</p><Button asChild className="mt-5 min-h-11"><Link href="/projects">前往项目 <ArrowRight className="h-4 w-4" /></Link></Button></CardContent></Card></div>;
  }

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <PageHeader title="优化中心" description="把 SEO 问题、GEO 缺口、知识缺口与竞争差距统一转化为可执行任务。" />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {projects.map((project) => <button key={project.id} onClick={() => setProjectId(project.id)} className={`min-h-11 shrink-0 rounded-xl border px-4 py-2 text-sm transition ${project.id === projectId ? "border-primary/40 bg-primary/15 text-primary" : "border-white/10 bg-white/[0.03] text-muted-foreground hover:text-foreground"}`}>{project.name}</button>)}
      </div>

      {error ? <div className="flex gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div> : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<ClipboardList className="h-5 w-5" />} label="任务总数" value={stats.total} />
        <StatCard icon={<Target className="h-5 w-5" />} label="未处理" value={stats.pending} />
        <StatCard icon={<Loader2 className="h-5 w-5" />} label="处理中" value={stats.processing} />
        <StatCard icon={<CheckCircle2 className="h-5 w-5" />} label="已完成" value={stats.completed} />
      </section>

      <div className="flex gap-2 overflow-x-auto pb-1" aria-label="优化机会分类">
        {filters.map((item) => <button key={item.key} onClick={() => setFilter(item.key)} className={`min-h-11 shrink-0 rounded-xl border px-4 text-sm transition ${filter === item.key ? "border-primary/40 bg-primary/15 text-primary" : "border-white/10 bg-white/[0.03] text-muted-foreground hover:text-foreground"}`}>{item.label}</button>)}
      </div>

      {loadingData ? <LoadingState label="正在汇总增长机会与优化任务…" compact /> : (
        <section className="grid min-w-0 gap-6 xl:grid-cols-2">
          <Card className="glass-panel min-w-0 border-white/10">
            <CardHeader><CardTitle className="text-lg">待转化增长机会（{visibleOpportunities.filter((item) => !item.trackedTaskId).length}）</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {visibleOpportunities.length ? visibleOpportunities.map((opportunity) => <OpportunityRow key={`${opportunity.source}-${opportunity.id}`} opportunity={opportunity} busy={busyOpportunityId === opportunity.id} onCreate={() => void createTask(opportunity)} />) : <p className="text-sm text-muted-foreground">当前分类暂无真实数据支持的增长机会。</p>}
            </CardContent>
          </Card>

          <Card className="glass-panel min-w-0 border-white/10">
            <CardHeader><CardTitle className="text-lg">统一执行任务（{tasks.length}）</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {tasks.length ? tasks.map((task) => <TaskRow key={task.id} task={task} busy={busyTaskId === task.id} highlighted={task.issueId === initialIssueId} onStatusChange={(status) => void updateStatus(task.id, status)} />) : <p className="text-sm text-muted-foreground">尚未创建优化任务，可从左侧增长机会加入。</p>}
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}

function LoadingState({ label, compact = false }: { label: string; compact?: boolean }) {
  return <div className={compact ? "flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-muted-foreground" : "space-y-6"}>{compact ? <><Loader2 className="h-4 w-4 animate-spin" />{label}</> : <><PageHeader title="优化中心" description="统一执行 SEO、GEO、知识与竞争优化任务。" /><div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{label}</div></>}</div>;
}

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return <Card className="glass-panel min-w-0 border-white/10"><CardContent className="p-5"><div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">{icon}</div><p className="mt-4 text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></CardContent></Card>;
}

function OpportunityRow({ opportunity, busy, onCreate }: { opportunity: GrowthOpportunity; busy: boolean; onCreate: () => void }) {
  return <article className="min-w-0 rounded-2xl border border-white/10 bg-background/35 p-4"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">来源：{opportunity.sourceLabel}</Badge><Badge variant={opportunity.severity === "suggestion" ? "muted" : "warning"}>{opportunity.impact}</Badge></div><h3 className="mt-3 break-words text-sm font-semibold">{opportunity.title}</h3><InfoBlock label="问题" value={opportunity.problem} /><InfoBlock label="建议" value={opportunity.recommendation} /><Button type="button" variant="outline" className="mt-4 min-h-11 w-full sm:w-auto" disabled={busy || Boolean(opportunity.trackedTaskId)} onClick={onCreate}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : opportunity.trackedTaskId ? <CheckCircle2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}{opportunity.trackedTaskId ? "已加入任务" : "加入优化任务"}</Button></article>;
}

function TaskRow({ task, busy, highlighted, onStatusChange }: { task: OptimizationTask; busy: boolean; highlighted: boolean; onStatusChange: (status: OptimizationStatus) => void }) {
  return <article id={`optimization-task-${task.id}`} className={`min-w-0 rounded-2xl border bg-white/[0.03] p-4 ${highlighted ? "border-primary/50 ring-2 ring-primary/20" : "border-white/10"}`}><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">来源：{taskSourceLabel(task)}</Badge><Badge variant={severityVariant(task.severity)}>影响：{getOptimizationSeverityLabel(task.severity)}</Badge></div><h3 className="mt-3 break-words text-sm font-semibold">{task.title}</h3><InfoBlock label="问题" value={task.description} /><InfoBlock label="建议" value={task.recommendation || "按照任务描述完成对应优化。"} /><div className="mt-4 flex flex-wrap items-center gap-2">{OPTIMIZATION_STATUSES.map((status) => <button key={status} type="button" onClick={() => onStatusChange(status)} disabled={busy || task.status === status} className={`min-h-11 rounded-xl border px-3 text-xs transition ${task.status === status ? "border-primary/40 bg-primary/15 text-primary" : "border-white/10 bg-white/[0.02] text-muted-foreground hover:text-foreground"}`}>{getOptimizationStatusLabel(status)}</button>)}{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}</div><p className="mt-3 text-xs text-muted-foreground">更新时间：{formatDateTime(task.updatedAt)}</p></article>;
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return <p className="mt-2 break-words text-sm leading-6 text-muted-foreground"><span className="font-medium text-foreground">{label}：</span>{value}</p>;
}

function taskSourceLabel(task: OptimizationTask) {
  if (task.issueId.startsWith("growth:REAL_AI_VISIBILITY_GAP") || task.category === "real_ai_visibility") return "真实 AI 可见性";
  if (task.issueId.startsWith("growth:AI_RECOMMENDATION_GAP") || task.category === "ai_recommendation") return "AI 推荐诊断";
  if (task.issueId.startsWith("growth:KNOWLEDGE_GAP") || task.category === "knowledge") return "知识评估";
  if (task.issueId.startsWith("growth:BENCHMARK_GAP") || task.issueId.startsWith("benchmark:") || task.category === "benchmark") return "竞品基准";
  if (task.category === "entity") return "GEO 分析";
  return "SEO 分析";
}

function severityVariant(severity: OptimizationSeverity) {
  return severity === "Low" ? "muted" as const : "warning" as const;
}

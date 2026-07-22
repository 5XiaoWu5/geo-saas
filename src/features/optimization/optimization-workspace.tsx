"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertCircle, ArrowRight, CheckCircle2, Circle, ClipboardList, Loader2, Plus, Target, XCircle } from "lucide-react";
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
import { useI18n } from "@/i18n/provider";

type ProjectSummary = { id: string; name: string; websiteUrl: string };
type OptimizationData = { tasks: OptimizationTask[]; issues: GeoIssue[]; trackedIssueIds: string[]; analysisAt: string | null; error?: string };
type WorkspaceData = { optimization: OptimizationData; assessment: KnowledgeAssessment; benchmark: BenchmarkOverviewResponse };
type OpportunityFilter = "ALL" | GrowthOpportunityDimension;
type ExecutionFeedback = { status: "running" | "completed" | "failed"; issue: string; operation: string; steps: Array<{ label: string; status: "pending" | "running" | "completed" | "failed"; detail?: string }>; result?: { taskId: string; modules: string[] } };

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
  const { locale } = useI18n();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [projectId, setProjectId] = useState(initialProjectId ?? "");
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [filter, setFilter] = useState<OpportunityFilter>("ALL");
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [busyOpportunityId, setBusyOpportunityId] = useState("");
  const [busyTaskId, setBusyTaskId] = useState("");
  const [error, setError] = useState("");
  const [execution, setExecution] = useState<ExecutionFeedback | null>(null);

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
  const aiRoadmap = tasks.filter((task) => task.issueId.startsWith("growth:REAL_AI_VISIBILITY_GAP") || task.issueId.startsWith("growth:REAL_AI_VISIBILITY_DROP") || task.issueId.startsWith("growth:RANKING_DROP") || task.issueId.startsWith("growth:CITATION_DROP") || task.issueId.startsWith("growth:AI_RECOMMENDATION_GAP") || task.issueId.startsWith("growth:KNOWLEDGE_GAP") || task.issueId.startsWith("growth:BENCHMARK_GAP") || task.issueId.startsWith("benchmark:")).sort((left, right) => severityRank(left.severity) - severityRank(right.severity) || statusRank(left.status) - statusRank(right.status)).slice(0, 10);

  useEffect(() => {
    if (!initialIssueId || !tasks.some((task) => task.issueId === initialIssueId)) return;
    const task = tasks.find((item) => item.issueId === initialIssueId);
    const frame = requestAnimationFrame(() => document.getElementById(`optimization-task-${task?.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
    return () => cancelAnimationFrame(frame);
  }, [initialIssueId, tasks]);

  async function createTask(opportunity: GrowthOpportunity) {
    setBusyOpportunityId(opportunity.id);
    setError("");
    const steps: ExecutionFeedback["steps"] = [{ label: "读取当前数据", status: "completed", detail: opportunity.sourceLabel }, { label: "生成优化方案", status: "completed", detail: opportunity.recommendation }, { label: "创建优化任务", status: "running" }, { label: "记录执行结果", status: "pending" }];
    setExecution({ status: "running", issue: opportunity.problem, operation: opportunity.recommendation, steps });
    try {
      const result = await readJson<{ task: OptimizationTask }>(await fetch(`/api/projects/${projectId}/optimization`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunity: toGrowthOpportunityTaskInput(opportunity) }),
      }));
      setExecution({ status: "running", issue: opportunity.problem, operation: opportunity.recommendation, steps: steps.map((step, index) => index === 2 ? { ...step, status: "completed", detail: result.task.id } : index === 3 ? { ...step, status: "running" } : step) });
      await loadData(projectId);
      setExecution({ status: "completed", issue: opportunity.problem, operation: opportunity.recommendation, steps: steps.map((step, index) => ({ ...step, status: "completed", detail: index === 2 ? result.task.id : step.detail })), result: { taskId: result.task.id, modules: [opportunity.dimension, "Optimization", "Growth Timeline"] } });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "创建优化任务失败");
      setExecution(current => current ? { ...current, status: "failed", steps: current.steps.map(step => step.status === "running" ? { ...step, status: "failed" } : step) } : null);
    } finally {
      setBusyOpportunityId("");
    }
  }

  async function updateStatus(taskId: string, status: OptimizationStatus) {
    setBusyTaskId(taskId);
    setError("");
    const task = tasks.find(item => item.id === taskId);
    const steps: ExecutionFeedback["steps"] = [{ label: "读取当前任务", status: "completed", detail: taskId }, { label: "校验状态变化", status: "completed", detail: `${task?.status ?? "unknown"} → ${status}` }, { label: "更新优化任务", status: "running" }, { label: "记录执行结果", status: "pending" }];
    setExecution({ status: "running", issue: task?.description ?? taskId, operation: `更新状态为 ${status}`, steps });
    try {
      await readJson<{ task: OptimizationTask }>(await fetch(`/api/projects/${projectId}/optimization/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }));
      setExecution({ status: "running", issue: task?.description ?? taskId, operation: `更新状态为 ${status}`, steps: steps.map((step, index) => index === 2 ? { ...step, status: "completed" } : index === 3 ? { ...step, status: "running" } : step) });
      await loadData(projectId);
      setExecution({ status: "completed", issue: task?.description ?? taskId, operation: `更新状态为 ${status}`, steps: steps.map(step => ({ ...step, status: "completed" })), result: { taskId, modules: [task?.category ?? "Optimization", "Growth Timeline"] } });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "更新任务状态失败");
      setExecution(current => current ? { ...current, status: "failed", steps: current.steps.map(step => step.status === "running" ? { ...step, status: "failed" } : step) } : null);
    } finally {
      setBusyTaskId("");
    }
  }

  if (loadingProjects) return <LoadingState label="正在加载企业项目…" />;

  if (!projects.length) {
    return <div><PageHeader title={locale === "zh" ? "优化中心" : "Optimization Center"} description={locale === "zh" ? "统一执行 SEO、GEO、知识与竞争优化任务。" : "Execute SEO, GEO, knowledge, and competitive optimization tasks in one place."} /><Card className="glass-panel border-white/10"><CardContent className="p-8 text-center"><ClipboardList className="mx-auto h-8 w-8 text-primary" /><h2 className="mt-4 text-lg font-semibold">{locale === "zh" ? "还没有可优化的项目" : "No project is ready for optimization"}</h2><p className="mt-2 text-sm text-muted-foreground">{locale === "zh" ? "创建项目并完成首次网站分析后，增长机会会进入这里。" : "Create a project and complete the first website analysis to discover growth opportunities."}</p><Button asChild className="mt-5 min-h-11"><Link href="/projects">{locale === "zh" ? "前往项目" : "Go to projects"}<ArrowRight className="h-4 w-4" /></Link></Button></CardContent></Card></div>;
  }

  if (locale === "en") return <EnglishOptimizationWorkspace projects={projects} projectId={projectId} setProjectId={setProjectId} error={error} execution={execution} stats={stats} loadingData={loadingData} opportunities={visibleOpportunities} tasks={tasks} busyOpportunityId={busyOpportunityId} busyTaskId={busyTaskId} initialIssueId={initialIssueId} filter={filter} setFilter={setFilter} createTask={createTask} updateStatus={updateStatus} />;

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <PageHeader title="优化中心" description="把 SEO 问题、GEO 缺口、知识缺口与竞争差距统一转化为可执行任务。" />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {projects.map((project) => <button key={project.id} onClick={() => setProjectId(project.id)} className={`min-h-11 shrink-0 rounded-xl border px-4 py-2 text-sm transition ${project.id === projectId ? "border-primary/40 bg-primary/15 text-primary" : "border-white/10 bg-white/[0.03] text-muted-foreground hover:text-foreground"}`}>{project.name}</button>)}
      </div>

      {error ? <div className="flex gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div> : null}
      {execution ? <ExecutionPanel execution={execution} /> : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<ClipboardList className="h-5 w-5" />} label="任务总数" value={stats.total} />
        <StatCard icon={<Target className="h-5 w-5" />} label="未处理" value={stats.pending} />
        <StatCard icon={<Loader2 className="h-5 w-5" />} label="处理中" value={stats.processing} />
        <StatCard icon={<CheckCircle2 className="h-5 w-5" />} label="已完成" value={stats.completed} />
      </section>

      <Card className="glass-panel min-w-0 border-amber-300/20">
        <CardHeader className="flex-row items-start justify-between gap-3"><div><CardTitle className="flex items-center gap-2 text-lg"><Target className="h-5 w-5 text-amber-300" />AI Growth Roadmap</CardTitle><p className="mt-2 text-sm text-muted-foreground">从真实 AI 可见性、推荐诊断、知识缺口与竞品差距任务中提取 Top 10。</p></div>{projectId ? <Button asChild variant="outline" className="min-h-11 shrink-0"><Link href={`/projects/${projectId}/geo/command-center`}>增长驾驶舱</Link></Button> : null}</CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">{aiRoadmap.length ? aiRoadmap.map((task, index) => <div key={task.id} className="flex min-h-20 min-w-0 items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-4"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-300/10 text-xs font-semibold text-amber-200">{index + 1}</span><span className="min-w-0"><span className="flex flex-wrap gap-2"><Badge variant={task.severity === "High" ? "warning" : "outline"}>{task.severity === "High" ? "HIGH" : task.severity === "Medium" ? "MEDIUM" : "LOW"}</Badge><Badge variant="muted">{taskSourceLabel(task)}</Badge></span><span className="mt-2 block break-words text-sm font-semibold">{task.title}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{task.recommendation || task.description}</span></span></div>) : <p className="text-sm text-muted-foreground">当前没有可追溯的 AI 增长路线图任务。</p>}</CardContent>
      </Card>

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

function EnglishOptimizationWorkspace({ projects, projectId, setProjectId, error, execution, stats, loadingData, opportunities, tasks, busyOpportunityId, busyTaskId, initialIssueId, filter, setFilter, createTask, updateStatus }: { projects: ProjectSummary[]; projectId: string; setProjectId: (value: string) => void; error: string; execution: ExecutionFeedback | null; stats: { total: number; pending: number; processing: number; completed: number }; loadingData: boolean; opportunities: GrowthOpportunity[]; tasks: OptimizationTask[]; busyOpportunityId: string; busyTaskId: string; initialIssueId?: string; filter: OpportunityFilter; setFilter: (value: OpportunityFilter) => void; createTask: (opportunity: GrowthOpportunity) => Promise<void>; updateStatus: (taskId: string, status: OptimizationStatus) => Promise<void> }) {
  const englishFilters: Array<{ key: OpportunityFilter; label: string }> = [{ key: "ALL", label: "All" }, { key: "SEO", label: "SEO" }, { key: "GEO", label: "GEO" }, { key: "KNOWLEDGE", label: "Knowledge" }, { key: "COMPETITIVE", label: "Competitive" }];
  return <div className="min-w-0 space-y-6 overflow-x-hidden"><PageHeader title="Optimization Center" description="Turn SEO issues, GEO gaps, knowledge gaps, and competitive gaps into a single executable task system." /><div className="flex gap-2 overflow-x-auto pb-1">{projects.map(project => <button key={project.id} onClick={() => setProjectId(project.id)} className={`min-h-11 shrink-0 rounded-xl border px-4 py-2 text-sm ${project.id === projectId ? "border-primary/40 bg-primary/15 text-primary" : "border-white/10 text-muted-foreground"}`}>{project.name}</button>)}</div>{error ? <div className="flex gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"><AlertCircle className="h-4 w-4" />{error}</div> : null}{execution ? <ExecutionPanel execution={execution} locale="en" /> : null}<section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><StatCard icon={<ClipboardList className="h-5 w-5" />} label="Total tasks" value={stats.total} /><StatCard icon={<Target className="h-5 w-5" />} label="Pending" value={stats.pending} /><StatCard icon={<Loader2 className="h-5 w-5" />} label="In progress" value={stats.processing} /><StatCard icon={<CheckCircle2 className="h-5 w-5" />} label="Completed" value={stats.completed} /></section><Card className="glass-panel border-violet-300/20"><CardContent className="grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-center"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-violet-200">Recommended next step</p><h2 className="mt-2 text-lg font-semibold">{opportunities.find(item => !item.trackedTaskId)?.title ?? "No untracked evidence-backed opportunity is available."}</h2><p className="mt-2 text-sm text-muted-foreground">See the issue, understand the evidence, create a task, and review the recorded result below.</p></div><Button asChild className="min-h-11"><Link href={`/projects/${projectId}/automation`}>Start Auto Mode<ArrowRight className="h-4 w-4" /></Link></Button></CardContent></Card><div className="flex gap-2 overflow-x-auto pb-1">{englishFilters.map(item => <button key={item.key} onClick={() => setFilter(item.key)} className={`min-h-11 shrink-0 rounded-xl border px-4 text-sm ${filter === item.key ? "border-primary/40 bg-primary/15 text-primary" : "border-white/10 text-muted-foreground"}`}>{item.label}</button>)}</div>{loadingData ? <LoadingState label="Loading growth opportunities and optimization tasks…" compact /> : <section className="grid gap-6 xl:grid-cols-2"><Card className="glass-panel border-white/10"><CardHeader><CardTitle>Growth opportunities ({opportunities.filter(item => !item.trackedTaskId).length})</CardTitle></CardHeader><CardContent className="space-y-3">{opportunities.length ? opportunities.map(opportunity => <OpportunityRow key={`${opportunity.source}-${opportunity.id}`} opportunity={opportunity} busy={busyOpportunityId === opportunity.id} onCreate={() => void createTask(opportunity)} locale="en" />) : <p className="text-sm text-muted-foreground">No real evidence supports an opportunity in this category.</p>}</CardContent></Card><Card className="glass-panel border-white/10"><CardHeader><CardTitle>Unified execution tasks ({tasks.length})</CardTitle></CardHeader><CardContent className="space-y-3">{tasks.length ? tasks.map(task => <TaskRow key={task.id} task={task} busy={busyTaskId === task.id} highlighted={task.issueId === initialIssueId} onStatusChange={status => void updateStatus(task.id, status)} locale="en" />) : <p className="text-sm text-muted-foreground">No optimization task has been created. Add one from the evidence-backed opportunities.</p>}</CardContent></Card></section>}</div>;
}

function ExecutionPanel({ execution, locale = "zh" }: { execution: ExecutionFeedback; locale?: "zh" | "en" }) {
  return <Card className={`glass-panel ${execution.status === "failed" ? "border-rose-300/30" : execution.status === "completed" ? "border-emerald-300/30" : "border-violet-300/30"}`}><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-lg">{locale === "zh" ? "优化执行过程（Execution Timeline）" : "Execution Timeline"}</CardTitle><p className="mt-2 text-sm text-muted-foreground"><strong className="text-foreground">{locale === "zh" ? "发现问题" : "Detected issue"}：</strong>{execution.issue}</p><p className="mt-1 text-sm text-muted-foreground"><strong className="text-foreground">{locale === "zh" ? "准备执行" : "Operation"}：</strong>{execution.operation}</p></div><Badge variant={execution.status === "completed" ? "success" : execution.status === "failed" ? "warning" : "outline"}>{execution.status}</Badge></div></CardHeader><CardContent><ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{execution.steps.map((step, index) => { const Icon = step.status === "completed" ? CheckCircle2 : step.status === "failed" ? XCircle : step.status === "running" ? Loader2 : Circle; const englishLabels = ["Read current data", "Generate optimization plan", "Create or update task", "Record execution result"]; return <li key={`${step.label}-${index}`} className="min-w-0 rounded-2xl border border-white/10 p-4"><div className="flex items-center gap-2"><Icon className={`h-4 w-4 shrink-0 ${step.status === "running" ? "animate-spin text-violet-300" : step.status === "completed" ? "text-emerald-300" : step.status === "failed" ? "text-rose-300" : "text-muted-foreground"}`} /><span className="text-xs text-muted-foreground">Step {index + 1}</span></div><p className="mt-3 text-sm font-medium">{locale === "zh" ? step.label : englishLabels[index]}</p>{step.detail ? <p className="mt-2 break-words text-xs text-muted-foreground">{step.detail}</p> : null}</li>; })}</ol>{execution.result ? <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.04] p-4"><p className="text-sm font-medium text-emerald-200">✅ {locale === "zh" ? "已创建/更新 Optimization Task" : "Optimization Task created or updated"}</p><p className="mt-2 break-all text-xs text-muted-foreground">{locale === "zh" ? "关联记录" : "Related record"}：{execution.result.taskId}</p><p className="mt-1 text-xs text-muted-foreground">{locale === "zh" ? "影响模块" : "Affected modules"}：{execution.result.modules.join(" · ")}</p></div> : null}</CardContent></Card>;
}

function LoadingState({ label, compact = false }: { label: string; compact?: boolean }) {
  return <div className={compact ? "flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-muted-foreground" : "space-y-6"}>{compact ? <><Loader2 className="h-4 w-4 animate-spin" />{label}</> : <><PageHeader title="优化中心" description="统一执行 SEO、GEO、知识与竞争优化任务。" /><div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{label}</div></>}</div>;
}

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return <Card className="glass-panel min-w-0 border-white/10"><CardContent className="p-5"><div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">{icon}</div><p className="mt-4 text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></CardContent></Card>;
}

function OpportunityRow({ opportunity, busy, onCreate, locale = "zh" }: { opportunity: GrowthOpportunity; busy: boolean; onCreate: () => void; locale?: "zh" | "en" }) {
  return <article className="min-w-0 rounded-2xl border border-white/10 bg-background/35 p-4"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{locale === "zh" ? "来源" : "Source"}：{opportunity.sourceLabel}</Badge><Badge variant={opportunity.severity === "suggestion" ? "muted" : "warning"}>{opportunity.impact}</Badge></div><h3 className="mt-3 break-words text-sm font-semibold">{opportunity.title}</h3><InfoBlock label={locale === "zh" ? "问题" : "Issue"} value={opportunity.problem} /><InfoBlock label={locale === "zh" ? "建议" : "Recommendation"} value={opportunity.recommendation} /><Button type="button" variant="outline" className="mt-4 min-h-11 w-full sm:w-auto" disabled={busy || Boolean(opportunity.trackedTaskId)} onClick={onCreate}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : opportunity.trackedTaskId ? <CheckCircle2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}{opportunity.trackedTaskId ? (locale === "zh" ? "已加入任务" : "Already tracked") : (locale === "zh" ? "加入优化任务" : "Create optimization task")}</Button></article>;
}

function TaskRow({ task, busy, highlighted, onStatusChange, locale = "zh" }: { task: OptimizationTask; busy: boolean; highlighted: boolean; onStatusChange: (status: OptimizationStatus) => void; locale?: "zh" | "en" }) {
  return <article id={`optimization-task-${task.id}`} className={`min-w-0 rounded-2xl border bg-white/[0.03] p-4 ${highlighted ? "border-primary/50 ring-2 ring-primary/20" : "border-white/10"}`}><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{locale === "zh" ? "来源" : "Source"}：{taskSourceLabel(task)}</Badge><Badge variant={severityVariant(task.severity)}>{locale === "zh" ? "影响" : "Impact"}：{locale === "zh" ? getOptimizationSeverityLabel(task.severity) : task.severity}</Badge></div><h3 className="mt-3 break-words text-sm font-semibold">{task.title}</h3><InfoBlock label={locale === "zh" ? "问题" : "Issue"} value={task.description} /><InfoBlock label={locale === "zh" ? "建议" : "Recommendation"} value={task.recommendation || (locale === "zh" ? "按照任务描述完成对应优化。" : "Complete the optimization described in this task.")} /><div className="mt-4 flex flex-wrap items-center gap-2">{OPTIMIZATION_STATUSES.map((status) => <button key={status} type="button" onClick={() => onStatusChange(status)} disabled={busy || task.status === status} className={`min-h-11 rounded-xl border px-3 text-xs transition ${task.status === status ? "border-primary/40 bg-primary/15 text-primary" : "border-white/10 bg-white/[0.02] text-muted-foreground hover:text-foreground"}`}>{locale === "zh" ? getOptimizationStatusLabel(status) : status === "PENDING" ? "Pending" : status === "PROCESSING" ? "In progress" : "Completed"}</button>)}{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}</div><p className="mt-3 text-xs text-muted-foreground">{locale === "zh" ? "更新时间" : "Updated"}：{formatDateTime(task.updatedAt)}</p></article>;
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return <p className="mt-2 break-words text-sm leading-6 text-muted-foreground"><span className="font-medium text-foreground">{label}：</span>{value}</p>;
}

function taskSourceLabel(task: OptimizationTask) {
  if (task.category === "ai_monitoring" || task.issueId.startsWith("growth:REAL_AI_VISIBILITY_DROP") || task.issueId.startsWith("growth:RANKING_DROP") || task.issueId.startsWith("growth:CITATION_DROP")) return "AI 持续监控";
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

function severityRank(severity: OptimizationSeverity) { return severity === "High" ? 1 : severity === "Medium" ? 2 : 3; }
function statusRank(status: OptimizationStatus) { return status === "PENDING" ? 1 : status === "PROCESSING" ? 2 : 3; }

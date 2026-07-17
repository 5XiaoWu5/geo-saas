"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { ReactNode } from "react";
import { AlertCircle, ArrowRight, CheckCircle2, ClipboardList, Loader2, Plus, Sparkles, Target } from "lucide-react";
import type { GeoIssue } from "@/features/geo-analysis/types";
import { categoryLabel, recommendForIssue } from "@/features/geo-analysis/recommendations";
import {
  getOptimizationSeverityLabel,
  getOptimizationStatusLabel,
  OPTIMIZATION_STATUSES,
  type OptimizationSeverity,
  type OptimizationStatus,
  type OptimizationTask,
} from "@/features/optimization/types";
import { toIssueId, toOptimizationSeverity } from "@/features/optimization/mapper";
import { ComingSoon, PageHeader } from "@/components/shared/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";

type ProjectSummary = { id: string; name: string; websiteUrl: string };

type OptimizationData = {
  tasks: OptimizationTask[];
  issues: GeoIssue[];
  trackedIssueIds: string[];
  analysisAt: string | null;
  error?: string;
};

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  const data = text ? (JSON.parse(text) as T & { error?: string }) : ({} as T & { error?: string });
  if (!response.ok) throw new Error(data.error ?? "请求失败");
  return data;
}

export function OptimizationWorkspace({ initialProjectId }: { initialProjectId?: string }) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [projectId, setProjectId] = useState(initialProjectId ?? "");
  const [data, setData] = useState<OptimizationData | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [busyIssueId, setBusyIssueId] = useState("");
  const [busyTaskId, setBusyTaskId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const result = await readJson<{ projects: { id: string; name: string; websiteUrl: string }[] }>(await fetch("/api/projects", { cache: "no-store" }));
        if (!mounted) return;
        const list = result.projects.map((project) => ({ id: project.id, name: project.name, websiteUrl: project.websiteUrl }));
        setProjects(list);
        setProjectId((current) => current || list[0]?.id || "");
      } catch (requestError) {
        if (mounted) setError(requestError instanceof Error ? requestError.message : "项目加载失败");
      } finally {
        if (mounted) setLoadingProjects(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const loadData = useCallback(async (id: string) => {
    if (!id) return;
    setLoadingData(true);
    setError("");
    try {
      const result = await readJson<OptimizationData>(await fetch(`/api/projects/${id}/optimization`, { cache: "no-store" }));
      setData(result);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "优化数据加载失败");
      setData(null);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (projectId) void loadData(projectId);
  }, [projectId, loadData]);

  async function createTask(issue: GeoIssue) {
    setBusyIssueId(toIssueId(issue));
    setError("");
    try {
      await readJson<{ task: OptimizationTask }>(
        await fetch(`/api/projects/${projectId}/optimization`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ issue }),
        }),
      );
      await loadData(projectId);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "创建优化任务失败");
    } finally {
      setBusyIssueId("");
    }
  }

  async function updateStatus(taskId: string, status: OptimizationStatus) {
    setBusyTaskId(taskId);
    setError("");
    try {
      await readJson<{ task: OptimizationTask }>(
        await fetch(`/api/projects/${projectId}/optimization/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }),
      );
      await loadData(projectId);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "更新任务状态失败");
    } finally {
      setBusyTaskId("");
    }
  }

  if (loadingProjects) {
    return (
      <div>
        <PageHeader title="优化中心" description="把 GEO 分析发现的问题转化为可跟踪的优化任务。" />
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> 正在加载项目...
        </div>
      </div>
    );
  }

  if (error && projects.length === 0) {
    return (
      <div>
        <PageHeader title="优化中心" description="把 GEO 分析发现的问题转化为可跟踪的优化任务。" />
        <div className="flex gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div>
        <PageHeader title="优化中心" description="把 GEO 分析发现的问题转化为可跟踪的优化任务。" />
        <ComingSoon
          icon={<ClipboardList className="h-6 w-6" />}
          badge="等待项目"
          title="还没有项目"
          description="优化中心基于真实项目的 GEO 分析结果生成优化任务。请先创建项目并运行一次网站扫描。"
          featuresLabel="优化中心能力"
          features={["从真实问题一键创建优化任务", "任务状态跟踪（未处理/处理中/已完成）", "规则引擎生成可执行优化建议"]}
          action={<Button asChild><Link href="/projects">前往项目 <ArrowRight className="h-4 w-4" /></Link></Button>}
        />
      </div>
    );
  }

  const tasks = data?.tasks ?? [];
  const tracked = new Set(data?.trackedIssueIds ?? []);
  const untrackedIssues = (data?.issues ?? []).filter((issue) => !tracked.has(toIssueId(issue)));
  const stats = {
    total: tasks.length,
    pending: tasks.filter((task) => task.status === "PENDING").length,
    processing: tasks.filter((task) => task.status === "PROCESSING").length,
    completed: tasks.filter((task) => task.status === "COMPLETED").length,
  };

  return (
    <div className="space-y-6">
      <PageHeader title="优化中心" description="把 GEO 分析发现的问题转化为可跟踪的优化任务。" />

      <div className="flex flex-wrap items-center gap-2">
        {projects.map((project) => (
          <button
            key={project.id}
            onClick={() => setProjectId(project.id)}
            className={`rounded-xl border px-4 py-2 text-sm transition ${project.id === projectId ? "border-primary/40 bg-primary/15 text-primary" : "border-white/10 bg-white/[0.03] text-muted-foreground hover:text-foreground"}`}
          >
            {project.name}
          </button>
        ))}
      </div>

      {error ? (
        <div className="flex gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<ClipboardList className="h-5 w-5" />} label="任务总数" value={stats.total} />
        <StatCard icon={<Target className="h-5 w-5" />} label="未处理" value={stats.pending} />
        <StatCard icon={<Loader2 className="h-5 w-5" />} label="处理中" value={stats.processing} />
        <StatCard icon={<CheckCircle2 className="h-5 w-5" />} label="已完成" value={stats.completed} />
      </section>

      {loadingData ? (
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> 正在加载优化数据...
        </div>
      ) : (
        <section className="grid gap-6 xl:grid-cols-2">
          <Card className="glass-panel border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><Sparkles className="h-5 w-5 text-primary" /> 待跟踪问题（{untrackedIssues.length}）</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(data?.issues.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">该项目还没有分析结果。请先在项目详情页运行「开始分析」。</p>
              ) : untrackedIssues.length === 0 ? (
                <p className="text-sm text-muted-foreground">所有问题都已加入优化任务。</p>
              ) : (
                untrackedIssues.map((issue, index) => (
                  <IssueRow
                    key={toIssueId(issue) + index}
                    issue={issue}
                    busy={busyIssueId === toIssueId(issue)}
                    onCreate={() => void createTask(issue)}
                  />
                ))
              )}
            </CardContent>
          </Card>

          <Card className="glass-panel border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><ClipboardList className="h-5 w-5 text-primary" /> 优化任务（{tasks.length}）</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">还没有优化任务。从左侧问题列表点击「加入任务」开始跟踪。</p>
              ) : (
                tasks.map((task) => (
                  <TaskRow key={task.id} task={task} busy={busyTaskId === task.id} onStatusChange={(status) => void updateStatus(task.id, status)} />
                ))
              )}
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}

function severityVariant(severity: OptimizationSeverity) {
  if (severity === "High") return "warning" as const;
  if (severity === "Medium") return "warning" as const;
  return "muted" as const;
}

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <Card className="glass-panel border-white/10">
      <CardContent className="p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">{icon}</div>
        <p className="mt-4 text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}

function IssueRow({ issue, busy, onCreate }: { issue: GeoIssue; busy: boolean; onCreate: () => void }) {
  const severity = toOptimizationSeverity(issue.severity);
  return (
    <div className="rounded-2xl border border-white/10 bg-background/35 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="break-words text-sm font-medium text-foreground">{issue.title}</p>
          <p className="mt-1 break-words text-sm text-muted-foreground">{issue.description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant="outline">{categoryLabel(issue.category)}</Badge>
          <Badge variant={severityVariant(severity)}>{getOptimizationSeverityLabel(severity)}</Badge>
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="min-w-0 break-words text-xs text-muted-foreground">建议：{recommendForIssue(issue)}</p>
        <Button size="sm" variant="outline" onClick={onCreate} disabled={busy} className="shrink-0">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} 加入任务
        </Button>
      </div>
    </div>
  );
}

function TaskRow({ task, busy, onStatusChange }: { task: OptimizationTask; busy: boolean; onStatusChange: (status: OptimizationStatus) => void }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="break-words text-sm font-medium text-foreground">{task.title}</p>
          <p className="mt-1 break-words text-sm text-muted-foreground">{task.recommendation || task.description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant="outline">{task.category ? categoryLabel(task.category as GeoIssue["category"]) : "优化"}</Badge>
          <Badge variant={severityVariant(task.severity)}>{getOptimizationSeverityLabel(task.severity)}</Badge>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {OPTIMIZATION_STATUSES.map((status) => (
          <button
            key={status}
            onClick={() => onStatusChange(status)}
            disabled={busy || task.status === status}
            className={`rounded-lg border px-3 py-1.5 text-xs transition disabled:opacity-100 ${task.status === status ? "border-primary/40 bg-primary/15 text-primary" : "border-white/10 bg-white/[0.02] text-muted-foreground hover:text-foreground disabled:cursor-not-allowed"}`}
          >
            {getOptimizationStatusLabel(status)}
          </button>
        ))}
        {busy ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
        <span className="ml-auto text-xs text-muted-foreground">更新于 {formatDateTime(task.updatedAt)}</span>
      </div>
    </div>
  );
}

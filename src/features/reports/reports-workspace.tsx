"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { AlertCircle, ArrowRight, BarChart3, CheckCircle2, ClipboardList, FileText, Globe2, Loader2, Sparkles, Target } from "lucide-react";
import type { GeoIssue } from "@/features/geo-analysis/types";
import { categoryLabel, recommendForIssue } from "@/features/geo-analysis/recommendations";
import type { ProjectReport, ReportsResponse } from "@/features/reports/types";
import { ComingSoon, PageHeader } from "@/components/shared/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatDateTime, getHostname } from "@/lib/format";

async function loadReports(): Promise<ReportsResponse> {
  const response = await fetch("/api/reports", { cache: "no-store" });
  const text = await response.text();
  const data = text ? (JSON.parse(text) as ReportsResponse) : ({} as ReportsResponse);
  if (!response.ok) throw new Error(data.error ?? "报告数据加载失败");
  return data;
}

export function ReportsWorkspace() {
  const [data, setData] = useState<ReportsResponse | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    loadReports()
      .then((result) => {
        if (!mounted) return;
        setData(result);
        setSelectedProjectId(result.reports.find((report) => report.analysis)?.projectId ?? result.reports[0]?.projectId ?? "");
      })
      .catch((requestError) => {
        if (mounted) setError(requestError instanceof Error ? requestError.message : "报告数据加载失败");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div>
        <PageHeader title="GEO 报告中心" description="基于真实扫描、分析和优化任务生成客户可查看的项目报告。" />
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> 正在加载真实报告数据...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader title="GEO 报告中心" description="基于真实扫描、分析和优化任务生成客户可查看的项目报告。" />
        <div className="flex gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      </div>
    );
  }

  if (!data || data.reports.length === 0) {
    return (
      <div>
        <PageHeader title="GEO 报告中心" description="基于真实扫描、分析和优化任务生成客户可查看的项目报告。" />
        <ComingSoon
          icon={<FileText className="h-6 w-6" />}
          badge="等待项目"
          title="还没有可生成报告的项目"
          description="报告中心只读取真实项目数据。创建项目并运行网站分析后，这里会展示 GEO 评分、问题诊断和优化进度。"
          featuresLabel="报告内容"
          features={["项目网站与分析时间", "真实 GEO 评分和问题诊断", "优化任务完成进度"]}
          action={
            <Button asChild>
              <Link href="/projects">
                前往项目 <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  const activeReport = data.reports.find((report) => report.projectId === selectedProjectId) ?? data.reports[0];
  const analyzedReports = data.reports.filter((report) => report.analysis).length;
  const issueCount = activeReport.analysis?.issues.length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="GEO 报告中心"
        description="基于真实扫描、分析和优化任务生成客户可查看的项目报告。"
        action={
          <Button asChild variant="outline">
            <Link href="/analyzer">
              <Sparkles className="h-4 w-4" /> 查看分析器
            </Link>
          </Button>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={<FileText className="h-5 w-5" />} label="可用报告" value={`${analyzedReports}`} suffix={`/${data.totalProjects}`} description="已有真实 GEO 分析的项目" />
        <SummaryCard icon={<Target className="h-5 w-5" />} label="当前总分" value={activeReport.analysis ? `${activeReport.analysis.totalScore}` : "待分析"} description="当前项目最新分析总分" />
        <SummaryCard icon={<ClipboardList className="h-5 w-5" />} label="诊断问题" value={`${issueCount}`} description="来自 GeoAnalysis issues" />
        <SummaryCard icon={<CheckCircle2 className="h-5 w-5" />} label="优化完成" value={`${activeReport.optimization.completedTasks}`} suffix={`/${activeReport.optimization.totalTasks}`} description="来自 OptimizationTask 状态" />
      </section>

      <div className="flex flex-wrap gap-2">
        {data.reports.map((report) => (
          <button
            key={report.projectId}
            onClick={() => setSelectedProjectId(report.projectId)}
            className={`rounded-xl border px-4 py-2 text-sm transition ${report.projectId === activeReport.projectId ? "border-primary/40 bg-primary/15 text-primary" : "border-white/10 bg-white/[0.03] text-muted-foreground hover:text-foreground"}`}
          >
            {report.projectName}
          </button>
        ))}
      </div>

      <ProjectReportView report={activeReport} />
    </div>
  );
}

function ProjectReportView({ report }: { report: ProjectReport }) {
  if (!report.analysis) {
    return (
      <Card className="glass-panel border-white/10">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-lg font-semibold text-foreground">{report.projectName}</p>
              <p className="mt-1 text-sm text-muted-foreground">{getHostname(report.websiteUrl)}</p>
              <p className="mt-4 text-sm text-muted-foreground">该项目还没有真实 GEO 分析结果。请先进入项目详情运行一次“开始分析”。</p>
            </div>
            <Button asChild>
              <Link href={`/projects/${report.projectId}`}>进入项目 <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="glass-panel border-white/10">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-xl">
              <FileText className="h-5 w-5 text-primary" /> {report.projectName}
            </CardTitle>
            <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              <InfoLine icon={<Globe2 className="h-4 w-4" />} label="网站" value={getHostname(report.websiteUrl)} />
              <InfoLine icon={<BarChart3 className="h-4 w-4" />} label="分析时间" value={formatDateTime(report.analysis.createdAt)} />
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={`/projects/${report.projectId}`}>项目详情 <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </CardHeader>
      </Card>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="glass-panel border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5 text-primary" /> GEO 评分
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-3xl border border-primary/20 bg-primary/[0.06] p-5">
              <p className="text-sm text-muted-foreground">总分</p>
              <p className="mt-2 text-5xl font-semibold tracking-tight text-primary">{report.analysis.totalScore}</p>
              <Progress value={report.analysis.totalScore} className="mt-4" />
            </div>
            <ScoreRow label="实体评分" value={report.analysis.entityScore} max={30} />
            <ScoreRow label="结构化评分" value={report.analysis.schemaScore} max={25} />
            <ScoreRow label="技术评分" value={report.analysis.technicalScore} max={25} />
            <ScoreRow label="内容评分" value={report.analysis.contentScore} max={20} />
          </CardContent>
        </Card>

        <Card className="glass-panel border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardList className="h-5 w-5 text-primary" /> 优化进度
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              <ProgressTile label="总任务数" value={report.optimization.totalTasks} />
              <ProgressTile label="已完成" value={report.optimization.completedTasks} />
              <ProgressTile label="未完成" value={report.optimization.incompleteTasks} />
            </div>
            <Progress value={report.optimization.totalTasks ? (report.optimization.completedTasks / report.optimization.totalTasks) * 100 : 0} className="mt-5" />
            <p className="mt-3 text-sm text-muted-foreground">优化任务来自当前项目的 OptimizationTask，状态为“已完成”的任务会计入完成进度。</p>
          </CardContent>
        </Card>
      </section>

      <Card className="glass-panel border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertCircle className="h-5 w-5 text-primary" /> 问题诊断
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {report.analysis.issues.length ? (
            report.analysis.issues.map((issue, index) => <IssueReportRow key={issue.category + issue.title + index} issue={issue} />)
          ) : (
            <p className="text-sm text-muted-foreground">当前分析未发现明显 GEO 问题。</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ icon, label, value, suffix, description }: { icon: ReactNode; label: string; value: string; suffix?: string; description: string }) {
  return (
    <Card className="glass-panel border-white/10">
      <CardContent className="p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">{icon}</div>
        <p className="mt-4 text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-foreground">
          {value}
          {suffix ? <span className="ml-1 text-sm text-muted-foreground">{suffix}</span> : null}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function InfoLine({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <span className="text-primary">{icon}</span>
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words font-medium text-foreground">{value}</span>
    </div>
  );
}

function ScoreRow({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">{value}/{max}</span>
      </div>
      <Progress value={(value / max) * 100} className="mt-3" />
    </div>
  );
}

function ProgressTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function severityMeta(severity: GeoIssue["severity"]) {
  if (severity === "critical") return { label: "严重", variant: "warning" as const };
  if (severity === "warning") return { label: "警告", variant: "warning" as const };
  return { label: "建议", variant: "muted" as const };
}

function IssueReportRow({ issue }: { issue: GeoIssue }) {
  const meta = severityMeta(issue.severity);
  return (
    <div className="rounded-2xl border border-white/10 bg-background/35 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="break-words text-sm font-medium text-foreground">{issue.title}</p>
          <p className="mt-1 break-words text-sm text-muted-foreground">{issue.description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant="outline">{categoryLabel(issue.category)}</Badge>
          <Badge variant={meta.variant}>{meta.label}</Badge>
        </div>
      </div>
      <div className="mt-3 rounded-xl border border-primary/15 bg-primary/[0.06] p-3 text-sm text-foreground">
        <span className="text-primary">建议：</span>
        <span className="break-words">{recommendForIssue(issue)}</span>
      </div>
    </div>
  );
}

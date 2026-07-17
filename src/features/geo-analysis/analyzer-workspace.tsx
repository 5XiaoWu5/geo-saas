"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { AlertCircle, ArrowRight, BarChart3, CheckCircle2, ClipboardList, FlaskConical, Layers3, Loader2, Sparkles, Target, TrendingUp } from "lucide-react";
import type { SimulationRecord } from "@/features/ai-search-simulator/types";
import type { GrowthTrend } from "@/features/growth/types";
import type { GeoAnalysis, GeoIssue } from "@/features/geo-analysis/types";
import { buildOptimizationSuggestions, categoryLabel, diagnoseIssues, type DiagnosedIssue, type OptimizationSuggestion } from "@/features/geo-analysis/recommendations";
import { GeoBrainScoreCard } from "@/features/geo-brain/components/GeoBrainScoreCard";
import type { GeoBrainAnalysis } from "@/features/geo-brain/types";
import { ComingSoon, PageHeader } from "@/components/shared/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatDateTime, getHostname } from "@/lib/format";
import { useI18n } from "@/i18n/provider";

type AnalyzerSummary = {
  totalScore: number;
  entityScore: number;
  schemaScore: number;
  technicalScore: number;
  contentScore: number;
  lastAnalysisAt: string | null;
};

type AnalyzedProject = {
  projectId: string;
  projectName: string;
  websiteUrl: string;
  analysis: GeoAnalysis;
  brainAnalysis: GeoBrainAnalysis | null;
  latestSimulation: SimulationRecord | null;
  growthTrend: GrowthTrend;
};

type AnalyzerResponse = {
  totalProjects: number;
  analyzedCount: number;
  summary: AnalyzerSummary | null;
  latest: AnalyzedProject | null;
  projects: AnalyzedProject[];
  error?: string;
};

async function loadAnalyzer(): Promise<AnalyzerResponse> {
  const response = await fetch("/api/analyzer", { cache: "no-store" });
  const text = await response.text();
  const data = text ? (JSON.parse(text) as AnalyzerResponse) : ({} as AnalyzerResponse);
  if (!response.ok) throw new Error(data.error ?? "GEO 分析数据加载失败");
  return data;
}

export function AnalyzerWorkspace() {
  const [data, setData] = useState<AnalyzerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [brainLoading, setBrainLoading] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    let mounted = true;
    loadAnalyzer()
      .then((result) => {
        if (!mounted) return;
        setData(result);
        setSelectedProjectId(result.latest?.projectId ?? "");
      })
      .catch((requestError) => {
        if (mounted) setError(requestError instanceof Error ? requestError.message : "GEO 分析数据加载失败");
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
        <PageHeader title="GEO 分析器" description="基于真实网站扫描结果的 AI 搜索可见性分析。" />
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> 正在加载真实 GEO 分析数据...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader title="GEO 分析器" description="基于真实网站扫描结果的 AI 搜索可见性分析。" />
        <div className="flex gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      </div>
    );
  }

  if (!data || data.analyzedCount === 0 || !data.summary) {
    return (
      <div>
        <PageHeader title="GEO 分析器" description="基于真实网站扫描结果的 AI 搜索可见性分析。" />
        <ComingSoon
          icon={<Sparkles className="h-6 w-6" />}
          badge="等待首次分析"
          title="还没有可分析的数据"
          description="GEO 分析器读取你项目的真实扫描结果。创建项目并在项目详情页运行一次「开始分析」后，这里会展示真实的 GEO 综合评分、问题诊断与优化建议。"
          featuresLabel="分析器能力"
          features={["综合与分项 GEO 评分", "基于扫描结果的问题诊断", "规则引擎生成的可执行优化建议"]}
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

  const activeProject = data.projects.find((project) => project.projectId === selectedProjectId) ?? data.projects[0];
  const diagnosed = diagnoseIssues(activeProject.analysis.issues);
  const suggestions = buildOptimizationSuggestions(activeProject.analysis.issues);
  const geoBrainAnalysis = activeProject.brainAnalysis ?? null;

  async function runGeoBrain() {
    setBrainLoading(true);
    setError("");
    try {
      const response = await fetch("/api/geo-brain/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: activeProject.projectId }),
      });
      const text = await response.text();
      const payload = text ? (JSON.parse(text) as { error?: string }) : {};
      if (!response.ok) throw new Error(payload.error ?? "GEO Brain failed");
      const refreshed = await loadAnalyzer();
      setData(refreshed);
      setSelectedProjectId(activeProject.projectId);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "GEO Brain failed");
    } finally {
      setBrainLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="GEO 分析器" description="基于真实网站扫描结果的 AI 搜索可见性分析。" />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={<Target className="h-5 w-5" />} label="综合 GEO 评分" value={`${data.summary.totalScore}`} suffix="/100" description="全部已分析项目均值" />
        <SummaryCard icon={<Layers3 className="h-5 w-5" />} label="已分析项目" value={`${data.analyzedCount}`} suffix={`/${data.totalProjects}`} description="完成扫描并生成评分" />
        <SummaryCard icon={<ClipboardList className="h-5 w-5" />} label="检测问题" value={`${activeProject.analysis.issues.length}`} description="当前所选项目的问题项" />
        <SummaryCard icon={<CheckCircle2 className="h-5 w-5" />} label="最近分析时间" value={data.summary.lastAnalysisAt ? formatDateTime(data.summary.lastAnalysisAt) : "—"} description="最近一次生成分析" small />
      </section>

      <Card className="glass-panel border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><BarChart3 className="h-5 w-5 text-primary" /> 综合分项评分</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <CategoryScore label="实体智能" value={data.summary.entityScore} max={30} />
          <CategoryScore label="结构化数据" value={data.summary.schemaScore} max={25} />
          <CategoryScore label="技术 GEO" value={data.summary.technicalScore} max={25} />
          <CategoryScore label="内容结构" value={data.summary.contentScore} max={20} />
        </CardContent>
      </Card>

      {data.projects.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {data.projects.map((project) => (
            <button
              key={project.projectId}
              onClick={() => setSelectedProjectId(project.projectId)}
              className={`rounded-xl border px-4 py-2 text-sm transition ${project.projectId === activeProject.projectId ? "border-primary/40 bg-primary/15 text-primary" : "border-white/10 bg-white/[0.03] text-muted-foreground hover:text-foreground"}`}
            >
              {project.projectName}
            </button>
          ))}
        </div>
      ) : null}

      <Card className="glass-panel border-white/10">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-lg"><Target className="h-5 w-5 text-primary" /> {activeProject.projectName}</CardTitle>
            <p className="mt-1 truncate text-sm text-muted-foreground">{getHostname(activeProject.websiteUrl)} · 分析于 {formatDateTime(activeProject.analysis.createdAt)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-3xl font-semibold text-primary">{activeProject.analysis.totalScore}</span>
            <Button asChild variant="outline" size="sm">
              <Link href={`/projects/${activeProject.projectId}`}>项目详情 <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`/optimization?projectId=${activeProject.projectId}`}>进入优化中心 <ClipboardList className="h-4 w-4" /></Link>
            </Button>
            <Button onClick={() => void runGeoBrain()} size="sm" variant="outline" disabled={brainLoading}>
              {brainLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} {t("geoBrain.runAnalysis")}
            </Button>
          </div>
        </CardHeader>
      </Card>

      <GeoBrainScoreCard analysis={geoBrainAnalysis} />

      {activeProject.latestSimulation?.result ? (
        <Card className="glass-panel border-white/10">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-medium text-primary"><FlaskConical className="h-4 w-4" /> {t("simulator.analyzerTitle")}</div>
              <p className="mt-2 break-words text-sm text-muted-foreground">{activeProject.latestSimulation.provider} · {activeProject.latestSimulation.query}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="font-mono text-3xl font-semibold text-foreground">{activeProject.latestSimulation.result.probability}%</div>
              <Button asChild variant="outline" size="sm"><Link href={`/project/${activeProject.projectId}/simulator`}>{t("simulator.viewSimulator")} <ArrowRight className="h-4 w-4" /></Link></Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="glass-panel border-white/10">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><CardTitle className="flex items-center gap-2 text-lg"><TrendingUp className="h-5 w-5 text-primary" />{t("growth.analyzerTitle")}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{t("growth.ranges.30d")}</p></div>
          <Button asChild variant="outline" size="sm"><Link href={`/project/${activeProject.projectId}/growth`}>{t("growth.viewGrowth")} <ArrowRight className="h-4 w-4" /></Link></Button>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {activeProject.growthTrend.deltas.slice(0, 4).map((delta) => <div key={delta.key} className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><p className="text-xs text-muted-foreground">{t(`growth.metrics.${delta.key}`)}</p><p className={delta.change === null ? "mt-2 font-mono text-xl text-muted-foreground" : delta.change >= 0 ? "mt-2 font-mono text-xl text-emerald-400" : "mt-2 font-mono text-xl text-rose-400"}>{delta.change === null ? t("growth.unavailable") : `${delta.change > 0 ? "+" : ""}${delta.change}`}</p></div>)}
        </CardContent>
      </Card>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="glass-panel border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><ClipboardList className="h-5 w-5 text-primary" /> 问题诊断（{diagnosed.length}）</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {diagnosed.length ? diagnosed.map((issue, index) => <IssueRow key={issue.category + issue.title + index} issue={issue} />) : <p className="text-sm text-muted-foreground">未发现明显问题。</p>}
          </CardContent>
        </Card>

        <Card className="glass-panel border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><Sparkles className="h-5 w-5 text-primary" /> 优化建议（规则引擎）</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {suggestions.length ? suggestions.map((suggestion, index) => <SuggestionRow key={suggestion.title + index} suggestion={suggestion} />) : <p className="text-sm text-muted-foreground">暂无优化建议。</p>}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function SummaryCard({ icon, label, value, suffix, description, small }: { icon: ReactNode; label: string; value: string; suffix?: string; description: string; small?: boolean }) {
  return (
    <Card className="glass-panel border-white/10">
      <CardContent className="p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">{icon}</div>
        <p className="mt-4 text-sm text-muted-foreground">{label}</p>
        <p className={`mt-1 font-semibold text-foreground ${small ? "text-base" : "text-2xl"}`}>{value}{suffix ? <span className="ml-1 text-sm text-muted-foreground">{suffix}</span> : null}</p>
        <p className="mt-2 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
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

function severityMeta(severity: GeoIssue["severity"]) {
  if (severity === "critical") return { label: "严重", variant: "warning" as const };
  if (severity === "warning") return { label: "警告", variant: "warning" as const };
  return { label: "建议", variant: "muted" as const };
}

function IssueRow({ issue }: { issue: DiagnosedIssue }) {
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
      <div className="mt-3 flex gap-2 rounded-xl border border-primary/15 bg-primary/[0.06] p-3 text-sm text-foreground">
        <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <span className="break-words">{issue.recommendation}</span>
      </div>
    </div>
  );
}

function SuggestionRow({ suggestion }: { suggestion: OptimizationSuggestion }) {
  const meta = severityMeta(suggestion.severity);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center gap-2">
        <Badge variant="outline">{categoryLabel(suggestion.category)}</Badge>
        <Badge variant={meta.variant}>{meta.label}</Badge>
      </div>
      <p className="mt-2 break-words text-sm font-medium text-foreground">{suggestion.title}</p>
      <p className="mt-1 break-words text-sm text-muted-foreground">{suggestion.recommendation}</p>
    </div>
  );
}

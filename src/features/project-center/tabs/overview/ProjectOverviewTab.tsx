"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  FileJson2,
  Globe2,
  Heading1,
  Heading2,
  Link2,
  Loader2,
  Radar,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import { useProject } from "@/features/project-center/context/ProjectContext";
import { getProjectStatusLabel } from "@/features/projects/project-mapper";
import type { GeoAnalysis, GeoIssue } from "@/features/geo-analysis/types";
import type { WebsiteScan } from "@/features/website-crawl/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatDate, formatDateTime, getHostname } from "@/lib/format";

type ScanResponse = {
  scan: WebsiteScan | null;
  analysis: GeoAnalysis | null;
  geoScore?: number;
  error?: string;
};

async function parseScanResponse(response: Response): Promise<ScanResponse> {
  const text = await response.text();
  const data = text ? (JSON.parse(text) as ScanResponse) : { scan: null, analysis: null };
  if (!response.ok) throw new Error(data.error ?? "网站扫描失败");
  return data;
}

export function ProjectOverviewTab() {
  const { project, refreshProject } = useProject();
  const [scan, setScan] = useState<WebsiteScan | null>(null);
  const [analysis, setAnalysis] = useState<GeoAnalysis | null>(null);
  const [loadingScan, setLoadingScan] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanError, setScanError] = useState("");

  const hasScan = Boolean(scan ?? project.lastScan);
  const score = analysis?.totalScore ?? project.geoScore ?? 0;
  const visibilityScore = project.visibilityScore ?? 0;

  useEffect(() => {
    let mounted = true;
    setLoadingScan(true);
    setScanError("");

    fetch(`/api/projects/${project.id}/scan`, { cache: "no-store" })
      .then(parseScanResponse)
      .then((data) => {
        if (!mounted) return;
        setScan(data.scan);
        setAnalysis(data.analysis);
        setScanProgress(data.scan ? 100 : 0);
      })
      .catch((error) => {
        if (mounted) setScanError(error instanceof Error ? error.message : "扫描结果加载失败");
      })
      .finally(() => {
        if (mounted) setLoadingScan(false);
      });

    return () => {
      mounted = false;
    };
  }, [project.id]);

  async function startScan() {
    setScanning(true);
    setScanError("");
    setScanProgress(25);

    try {
      setScanProgress(55);
      const data = await parseScanResponse(await fetch(`/api/projects/${project.id}/scan`, { method: "POST" }));
      setScanProgress(90);
      setScan(data.scan);
      setAnalysis(data.analysis);
      await refreshProject();
      setScanProgress(100);
    } catch (error) {
      setScanProgress(100);
      setScanError(error instanceof Error ? error.message : "网站扫描失败");
      await refreshProject();
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="glass-panel overflow-hidden border-white/10">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <ShieldCheck className="h-5 w-5 text-primary" /> 项目健康概览
                </CardTitle>
                <p className="mt-2 text-sm text-muted-foreground">基于真实网站扫描结果展示当前项目的 GEO 工作状态。</p>
              </div>
              <Badge variant={project.status === "Active" ? "success" : project.status === "Monitoring" ? "warning" : "muted"}>{getProjectStatusLabel(project.status)}</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <ScorePanel label="GEO 评分" value={score} description={hasScan ? "来自最近一次网站扫描" : "等待首次扫描"} />
            <ScorePanel label="AI 可见性" value={visibilityScore} description={hasScan ? "基于网站结构信号估算" : "扫描后生成可见性数据"} />
          </CardContent>
        </Card>

        <Card className="glass-panel border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Globe2 className="h-5 w-5 text-primary" /> 网站信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <InfoRow label="网站域名" value={getHostname(project.websiteUrl)} />
            <InfoRow label="完整 URL" value={project.websiteUrl} href={project.websiteUrl} />
            <InfoRow label="创建时间" value={formatDate(project.createdAt)} />
            <InfoRow label="当前状态" value={getProjectStatusLabel(project.status)} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <StatusCard
          icon={<ScanSearch className="h-5 w-5" />}
          title="最近扫描状态"
          value={scan ? formatDateTime(scan.createdAt) : project.lastScan ? formatDateTime(project.lastScan) : "尚未扫描"}
          description={scan?.status === "completed" ? "扫描完成，已保存真实网站解析结果。" : scan?.status === "failed" ? "最近扫描失败，请检查网站是否可访问。" : "点击开始分析后将真实抓取网站首页。"}
        />
        <StatusCard icon={<BarChart3 className="h-5 w-5" />} title="报告数量" value={`${project.reportsCount} 份`} description="后续报告会关联到当前项目，不与其他账号共享。" />
        <StatusCard icon={<Activity className="h-5 w-5" />} title="分析记录" value={project.lastAnalysisAt ? formatDateTime(project.lastAnalysisAt) : "暂无分析"} description="完成扫描后这里会展示最近一次分析时间。" />
      </section>

      <Card className="glass-panel border-white/10">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <ScanSearch className="h-5 w-5 text-primary" /> 网站扫描
            </CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">真实请求项目网站，解析标题、描述、标题结构、链接和 JSON-LD Schema。</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => void startScan()} disabled={scanning}>
              {scanning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> 正在分析...
                </>
              ) : (
                <>
                  <ScanSearch className="h-4 w-4" /> 开始分析
                </>
              )}
            </Button>
            <Button asChild variant="outline">
              <Link href="/analyzer">
                <Sparkles className="h-4 w-4" /> 进入 GEO 分析
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/projects/${project.id}/optimization`}>
                <ClipboardList className="h-4 w-4" /> 进入优化中心
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {scanning ? (
            <div className="mb-4 rounded-2xl border border-primary/20 bg-primary/10 p-4">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-primary">正在扫描网站并生成 GEO 评分</span>
                <span className="text-primary">{scanProgress}%</span>
              </div>
              <Progress value={scanProgress} className="mt-3" />
            </div>
          ) : null}

          {scanError ? (
            <div className="mb-4 flex gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" /> {scanError}
            </div>
          ) : null}

          {loadingScan ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> 正在加载扫描结果...
            </div>
          ) : (
            <div className="space-y-5">
              <GeoAnalysisPanel analysis={analysis} />
              <ScanResult scan={scan} />
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}

function GeoAnalysisPanel({ analysis }: { analysis: GeoAnalysis | null }) {
  if (!analysis) {
    return <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-muted-foreground">暂无 GEO 评分。完成网站扫描后，系统会自动生成真实分析结果。</div>;
  }

  const scoreItems = [
    { label: "实体智能", value: analysis.entityScore, max: 30 },
    { label: "结构化数据", value: analysis.schemaScore, max: 25 },
    { label: "技术 GEO", value: analysis.technicalScore, max: 25 },
    { label: "内容结构", value: analysis.contentScore, max: 20 },
  ];

  return (
    <div className="space-y-4 rounded-3xl border border-primary/20 bg-primary/[0.04] p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Target className="h-4 w-4" /> GEO 分析引擎 v1
          </div>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">GEO 总分 {analysis.totalScore}</h3>
          <p className="mt-2 text-sm text-muted-foreground">基于本次 WebsiteScan 的实体、Schema、技术和内容结构信号自动计算。</p>
        </div>
        <div className="w-full max-w-xs shrink-0 rounded-2xl border border-white/10 bg-background/40 p-4">
          <Progress value={analysis.totalScore} />
          <p className="mt-3 text-xs text-muted-foreground">分析时间：{formatDateTime(analysis.createdAt)}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {scoreItems.map((item) => (
          <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>{item.label}</span>
              <span>{item.value}/{item.max}</span>
            </div>
            <Progress value={(item.value / item.max) * 100} className="mt-3" />
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">问题列表</p>
        {analysis.issues.length ? (
          <div className="grid gap-2">
            {analysis.issues.slice(0, 8).map((issue, index) => <GeoIssueRow key={issue.category + issue.title + index} issue={issue} />)}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-muted-foreground">暂未发现明显 GEO 问题。</div>
        )}
      </div>
    </div>
  );
}

function GeoIssueRow({ issue }: { issue: GeoIssue }) {
  const severityLabel = issue.severity === "critical" ? "严重" : issue.severity === "warning" ? "警告" : "建议";
  const badgeVariant = issue.severity === "critical" || issue.severity === "warning" ? "warning" : "muted";

  return (
    <div className="rounded-2xl border border-white/10 bg-background/35 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="break-words text-sm font-medium text-foreground">{issue.title}</p>
          <p className="mt-1 break-words text-sm text-muted-foreground">{issue.description}</p>
        </div>
        <Badge variant={badgeVariant}>{severityLabel}</Badge>
      </div>
    </div>
  );
}

function ScanResult({ scan }: { scan: WebsiteScan | null }) {
  if (!scan) {
    return <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-muted-foreground">暂无扫描结果。点击“开始分析”后，系统会保存真实抓取结果。</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={scan.status === "completed" ? "success" : "warning"}>{scan.status === "completed" ? "扫描完成" : "扫描失败"}</Badge>
            <span className="text-xs text-muted-foreground">{formatDateTime(scan.createdAt)}</span>
          </div>
          <p className="mt-3 break-words text-lg font-semibold">{scan.title ?? "未发现页面标题"}</p>
          <p className="mt-2 break-words text-sm text-muted-foreground">{scan.description ?? "未发现 Meta Description"}</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ScanMetric icon={<Heading1 className="h-4 w-4" />} label="H1 数量" value={scan.h1Count} />
        <ScanMetric icon={<Heading2 className="h-4 w-4" />} label="H2 数量" value={scan.h2Count} />
        <ScanMetric icon={<Link2 className="h-4 w-4" />} label="内部链接" value={scan.internalLinkCount} />
        <ScanMetric icon={<Link2 className="h-4 w-4" />} label="外部链接" value={scan.externalLinkCount} />
        <ScanMetric icon={<FileJson2 className="h-4 w-4" />} label="Schema 数量" value={scan.schemaCount} />
        <ScanMetric icon={<CheckCircle2 className="h-4 w-4" />} label="Robots" value={scan.robotsExists ? "存在" : "未发现"} />
        <ScanMetric icon={<CheckCircle2 className="h-4 w-4" />} label="Sitemap" value={scan.sitemapExists ? "存在" : "未发现"} />
        <ScanMetric icon={<FileJson2 className="h-4 w-4" />} label="Schema 类型" value={scan.schemaTypes.length ? scan.schemaTypes.join(" / ") : "未发现"} />
      </div>
    </div>
  );
}

function ScanMetric({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <p className="mt-2 break-words text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

function ScorePanel({ label, value, description }: { label: string; value: number; description: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-4xl font-semibold tracking-tight text-foreground">{value}</p>
        </div>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
          <Radar className="h-6 w-6" />
        </div>
      </div>
      <Progress value={value} className="mt-4" />
      <p className="mt-3 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function InfoRow({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-muted-foreground">{label}</span>
      {href ? <a href={href} target="_blank" rel="noreferrer" className="break-all font-medium text-primary hover:underline">{value}</a> : <span className="break-all font-medium text-foreground">{value}</span>}
    </div>
  );
}

function StatusCard({ icon, title, value, description }: { icon: ReactNode; title: string; value: string; description: string }) {
  return (
    <Card className="glass-panel border-white/10">
      <CardContent className="p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">{icon}</div>
        <p className="mt-4 text-sm text-muted-foreground">{title}</p>
        <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
        <p className="mt-3 text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

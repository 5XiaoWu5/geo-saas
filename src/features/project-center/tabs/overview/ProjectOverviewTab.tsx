"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Activity, ArrowRight, BarChart3, Globe2, Radar, ScanSearch, ShieldCheck, Sparkles } from "lucide-react";
import { useProject } from "@/features/project-center/context/ProjectContext";
import { getProjectStatusLabel } from "@/features/projects/project-mapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatDate, formatDateTime, getHostname } from "@/lib/format";

export function ProjectOverviewTab() {
  const { project } = useProject();
  const hasScan = Boolean(project.lastScan);
  const score = project.geoScore ?? 0;
  const visibilityScore = project.visibilityScore ?? 0;

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
                <p className="mt-2 text-sm text-muted-foreground">基于当前项目资料展示基础 GEO 工作台状态。</p>
              </div>
              <Badge variant={project.status === "Active" ? "success" : project.status === "Monitoring" ? "warning" : "muted"}>{getProjectStatusLabel(project.status)}</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <ScorePanel label="GEO 评分" value={score} description={hasScan ? "最近一次扫描评分" : "等待首次扫描"} />
            <ScorePanel label="AI 可见性" value={visibilityScore} description={hasScan ? "AI 搜索曝光基础评分" : "扫描后生成可见性数据"} />
          </CardContent>
        </Card>

        <Card className="glass-panel border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl"><Globe2 className="h-5 w-5 text-primary" /> 网站信息</CardTitle>
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
        <StatusCard icon={<ScanSearch className="h-5 w-5" />} title="最近扫描状态" value={hasScan ? formatDateTime(project.lastScan) : "尚未扫描"} description={hasScan ? "可继续查看分析结果" : "运行首次 GEO Scan 后将生成页面、实体与结构信号。"} />
        <StatusCard icon={<BarChart3 className="h-5 w-5" />} title="报告数量" value={`${project.reportsCount} 份`} description="后续报告会关联到当前项目，不与其他账号共享。" />
        <StatusCard icon={<Activity className="h-5 w-5" />} title="分析记录" value={project.lastAnalysisAt ? formatDateTime(project.lastAnalysisAt) : "暂无分析"} description="完成扫描后这里会展示最近一次分析时间。" />
      </section>

      <Card className="glass-panel border-white/10">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl"><Sparkles className="h-5 w-5 text-primary" /> 后续分析入口</CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">从项目详情中心进入扫描、分析、可见性监控与优化闭环。</p>
          </div>
          <Button asChild>
            <Link href={`/projects/${project.id}/analyzer`}>进入 GEO 分析 <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <NextStep href={`/projects/${project.id}/analyzer`} title="GEO 分析" description="查看网站 GEO 基础评分、实体与结构信号。" />
          <NextStep href={`/projects/${project.id}/visibility`} title="可见性监控" description="跟踪 AI 搜索中的品牌出现与推荐位置。" />
          <NextStep href={`/projects/${project.id}/optimization`} title="优化中心" description="管理优化任务与内容改进建议。" />
          <NextStep href={`/projects/${project.id}/monitoring`} title="趋势监控" description="查看长期趋势与问题生命周期。" />
        </CardContent>
      </Card>
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

function NextStep({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link href={href} className="group rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-primary/30 hover:bg-primary/10">
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium text-foreground">{title}</p>
        <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{description}</p>
    </Link>
  );
}






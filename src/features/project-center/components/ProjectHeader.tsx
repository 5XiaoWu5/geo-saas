"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Activity, BarChart3, Building2, CalendarClock, CheckCircle2, ClipboardList, Eye, Globe2, MessagesSquare, Swords } from "lucide-react";
import { useProject } from "@/features/project-center/context/ProjectContext";
import { getProjectStatusLabel } from "@/features/projects/project-mapper";
import { useI18n } from "@/i18n/provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatDate, formatDateTime, getHostname } from "@/lib/format";

export function ProjectHeader() {
  const { project } = useProject();
  const { locale, t } = useI18n();
  const hasScan = Boolean(project.lastScan);
  const unavailable = locale === "zh" ? "待扫描" : "Pending scan";
  return (
    <Card className="glass-panel overflow-hidden border-white/10">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{project.name}</h1>
              <Badge variant={project.status === "Active" ? "success" : project.status === "Monitoring" ? "warning" : "muted"}>{locale === "zh" ? getProjectStatusLabel(project.status) : project.status}</Badge>
            </div>
            <a href={project.url} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-2 break-all text-sm text-muted-foreground hover:text-primary">
              <Globe2 className="h-4 w-4 shrink-0" /> {getHostname(project.url)}
            </a>
            <p className="mt-3 max-w-3xl text-sm text-muted-foreground">{project.description || (locale === "zh" ? "该项目暂无描述，可在项目列表中编辑补充。" : "No project description is available yet.")}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">{locale === "zh" ? "创建于" : "Created"} {formatDate(project.createdAt)}</span>
              <span className="max-w-full break-all rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-1">{locale === "zh" ? "项目 ID" : "Project ID"} {project.id}</span>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild>
                <Link href={`/projects/${project.id}/optimization`}>
                  <ClipboardList className="h-4 w-4" /> {locale === "zh" ? "进入优化中心" : "Optimization Center"}
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/projects/${project.id}/visibility`}>
                  <Eye className="h-4 w-4" /> {locale === "zh" ? "AI 可见性（AI Visibility）" : "AI Visibility"}
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/projects/${project.id}/entity`}>
                  <Building2 className="h-4 w-4" /> Entity Center
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/projects/${project.id}/campaigns`}>
                  <MessagesSquare className="h-4 w-4" /> {t("campaigns.enterCampaignCenter")}
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/projects/${project.id}/competitors`}>
                  <Swords className="h-4 w-4" /> {t("competitors.open")}
                </Link>
              </Button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:w-[560px]">
            <HeaderMetric icon={<BarChart3 className="h-4 w-4" />} label={locale === "zh" ? "GEO 评分（GEO Score）" : "GEO Score"} value={hasScan ? `${project.geoScore}` : unavailable} progress={hasScan ? project.geoScore : undefined} pendingLabel={locale === "zh" ? "等待首次扫描" : "Waiting for first scan"} />
            <HeaderMetric icon={<Activity className="h-4 w-4" />} label={locale === "zh" ? "AI 可见性（AI Visibility）" : "AI Visibility"} value={hasScan ? `${project.visibilityScore}` : unavailable} progress={hasScan ? project.visibilityScore : undefined} pendingLabel={locale === "zh" ? "等待首次扫描" : "Waiting for first scan"} />
            <HeaderMetric icon={<CheckCircle2 className="h-4 w-4" />} label={locale === "zh" ? "最近扫描（Latest Scan）" : "Latest Scan"} value={project.lastScan ? formatDateTime(project.lastScan) : (locale === "zh" ? "尚未扫描" : "Not scanned yet")} pendingLabel={locale === "zh" ? "等待首次扫描" : "Waiting for first scan"} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function HeaderMetric({ icon, label, value, progress, pendingLabel }: { icon: ReactNode; label: string; value: string; progress?: number; pendingLabel: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
      {typeof progress === "number" ? <Progress value={progress} className="mt-3" /> : <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><CalendarClock className="h-3.5 w-3.5" /> {pendingLabel}</div>}
    </div>
  );
}



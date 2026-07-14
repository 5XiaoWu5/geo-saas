"use client";

import type { ReactNode } from "react";
import { Activity, BarChart3, CalendarClock, CheckCircle2, Globe2 } from "lucide-react";
import { useProject } from "@/features/project-center/context/ProjectContext";
import { getProjectStatusLabel } from "@/features/projects/project-mapper";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatDate, formatDateTime, getHostname } from "@/lib/format";

export function ProjectHeader() {
  const { project } = useProject();
  return (
    <Card className="glass-panel overflow-hidden border-white/10">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{project.name}</h1>
              <Badge variant={project.status === "Active" ? "success" : project.status === "Monitoring" ? "warning" : "muted"}>{getProjectStatusLabel(project.status)}</Badge>
            </div>
            <a href={project.url} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-2 break-all text-sm text-muted-foreground hover:text-primary">
              <Globe2 className="h-4 w-4 shrink-0" /> {getHostname(project.url)}
            </a>
            <p className="mt-3 max-w-3xl text-sm text-muted-foreground">{project.description || "该项目暂无描述，可在项目列表中编辑补充。"}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">创建于 {formatDate(project.createdAt)}</span>
              <span className="max-w-full break-all rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-1">项目 ID {project.id}</span>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:w-[560px]">
            <HeaderMetric icon={<BarChart3 className="h-4 w-4" />} label="GEO 评分" value={`${project.geoScore}`} progress={project.geoScore} />
            <HeaderMetric icon={<Activity className="h-4 w-4" />} label="AI 可见性" value={`${project.visibilityScore}`} progress={project.visibilityScore} />
            <HeaderMetric icon={<CheckCircle2 className="h-4 w-4" />} label="最近扫描" value={project.lastScan ? formatDateTime(project.lastScan) : "尚未扫描"} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function HeaderMetric({ icon, label, value, progress }: { icon: ReactNode; label: string; value: string; progress?: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
      {typeof progress === "number" ? <Progress value={progress} className="mt-3" /> : <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><CalendarClock className="h-3.5 w-3.5" /> 等待首次扫描</div>}
    </div>
  );
}



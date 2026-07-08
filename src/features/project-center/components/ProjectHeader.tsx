"use client";

import { Activity, BarChart3, CheckCircle2, Globe2 } from "lucide-react";
import { useProject } from "@/features/project-center/context/ProjectContext";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatDateTime, getHostname } from "@/lib/format";

export function ProjectHeader() {
  const { project } = useProject();
  return (
    <Card className="glass-panel border-white/10">
      <CardContent className="p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{project.name}</h1>
              <Badge variant={project.status === "Active" ? "success" : project.status === "Monitoring" ? "warning" : "muted"}>{project.status}</Badge>
            </div>
            <a href={project.url} className="mt-2 flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
              <Globe2 className="h-4 w-4" /> {getHostname(project.url)}
            </a>
            <p className="mt-3 max-w-3xl text-sm text-muted-foreground">{project.description}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:w-[560px]">
            <HeaderMetric icon={<BarChart3 className="h-4 w-4" />} label="GEO Score" value={`${project.geoScore}`} progress={project.geoScore} />
            <HeaderMetric icon={<Activity className="h-4 w-4" />} label="AI Visibility" value={`${project.visibilityScore}`} progress={project.visibilityScore} />
            <HeaderMetric icon={<CheckCircle2 className="h-4 w-4" />} label="Last Scan" value={project.lastScan ? formatDateTime(project.lastScan) : "—"} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function HeaderMetric({ icon, label, value, progress }: { icon: React.ReactNode; label: string; value: string; progress?: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
      {typeof progress === "number" ? <Progress value={progress} className="mt-3" /> : null}
    </div>
  );
}


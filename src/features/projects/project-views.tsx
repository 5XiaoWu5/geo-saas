"use client";

import Link from "next/link";
import { CalendarClock, Edit3, ExternalLink, Globe2, Trash2 } from "lucide-react";
import type { Project } from "@/types/project";
import { getProjectCountryLabel, getProjectIndustryLabel, getProjectLanguageLabel, getProjectStatusLabel } from "@/features/projects/project-mapper";
import { useI18n } from "@/i18n/provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, getHostname } from "@/lib/format";

function statusVariant(status: Project["status"]) {
  if (status === "Active") return "success";
  if (status === "Monitoring") return "warning";
  return "muted";
}

export function ProjectCard({ project, onEdit, onDelete }: { project: Project; onEdit: (project: Project) => void; onDelete: (project: Project) => void }) {
  const { t } = useI18n();

  return (
    <Card className="glass-panel group border-white/10 transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-white/[0.06]">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Link href={`/projects/${project.id}`} className="truncate text-lg font-semibold tracking-tight hover:text-primary">{project.name}</Link>
              <Badge variant={statusVariant(project.status)}>{getProjectStatusLabel(project.status)}</Badge>
            </div>
            <a href={project.websiteUrl} className="mt-1 flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
              <Globe2 className="h-3.5 w-3.5" /> {getHostname(project.websiteUrl)} <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="flex gap-1 opacity-100 sm:opacity-0 sm:transition sm:group-hover:opacity-100">
            <Button size="icon" variant="ghost" onClick={() => onEdit(project)} aria-label={`${t("common.edit")} ${project.name}`}><Edit3 className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" onClick={() => onDelete(project)} aria-label={`${t("common.delete")} ${project.name}`}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        </div>
        <p className="mt-4 line-clamp-2 min-h-10 text-sm text-muted-foreground">{project.description}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Badge variant="outline">{getProjectLanguageLabel(project.language)}</Badge>
          <Badge variant="outline">{getProjectCountryLabel(project.country)}</Badge>
          <Badge variant="outline">{getProjectIndustryLabel(project.industry)}</Badge>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm">
          <div><p className="text-xs text-muted-foreground">{t("projects.geoScore")}</p><p className="font-semibold text-primary">{project.geoScore}%</p></div>
          <div><p className="text-xs text-muted-foreground">{t("projects.reports")}</p><p className="font-semibold">{project.reportsCount}</p></div>
          <div><p className="text-xs text-muted-foreground">{t("projects.created")}</p><p className="font-semibold">{formatDate(project.createdAt)}</p></div>
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5" /> {t("projects.lastAnalysisLabel")}: {formatDate(project.lastAnalysisAt)}
        </div>
      </CardContent>
    </Card>
  );
}

export function ProjectList({ projects, onEdit, onDelete }: { projects: Project[]; onEdit: (project: Project) => void; onDelete: (project: Project) => void }) {
  const { t } = useI18n();

  return (
    <Card className="glass-panel overflow-hidden border-white/10">
      <CardContent className="p-0">
        <div className="grid grid-cols-12 border-b border-white/10 px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <span className="col-span-4">{t("projects.title")}</span><span className="col-span-2 hidden md:block">{t("projects.market")}</span><span className="col-span-2 hidden lg:block">{t("projects.lastAnalysis")}</span><span className="col-span-2">{t("projects.score")}</span><span className="col-span-2 text-right">{t("common.actions")}</span>
        </div>
        {projects.map((project) => (
          <div key={project.id} className="grid grid-cols-12 items-center gap-3 border-b border-white/5 px-5 py-4 text-sm last:border-0 hover:bg-white/[0.03]">
            <div className="col-span-8 min-w-0 md:col-span-4">
              <div className="flex items-center gap-2"><Link href={`/projects/${project.id}`} className="truncate font-medium hover:text-primary">{project.name}</Link><Badge variant={statusVariant(project.status)}>{getProjectStatusLabel(project.status)}</Badge></div>
              <p className="truncate text-xs text-muted-foreground">{getHostname(project.websiteUrl)}</p>
            </div>
            <div className="col-span-2 hidden text-muted-foreground md:block">{getProjectLanguageLabel(project.language)} ? {getProjectCountryLabel(project.country)}</div>
            <div className="col-span-2 hidden text-muted-foreground lg:block">{formatDate(project.lastAnalysisAt)}</div>
            <div className="col-span-2"><span className="font-semibold text-primary">{project.geoScore}%</span><div className="mt-1 h-1.5 rounded-full bg-white/10"><div className="h-1.5 rounded-full bg-primary" style={{ width: `${project.geoScore}%` }} /></div></div>
            <div className="col-span-2 flex justify-end gap-1">
              <Button size="icon" variant="ghost" onClick={() => onEdit(project)} aria-label={`${t("common.edit")} ${project.name}`}><Edit3 className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => onDelete(project)} aria-label={`${t("common.delete")} ${project.name}`}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}





"use client";

import { Grid2X2, List, Search } from "lucide-react";
import type { ProjectSortKey, ProjectViewMode } from "@/types/project";
import { projectCountries, projectIndustries, projectLanguages } from "@/data/projects";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type ProjectFilters = {
  query: string;
  language: string;
  country: string;
  industry: string;
  sort: ProjectSortKey;
};

export function ProjectToolbar({ filters, viewMode, onFiltersChange, onViewModeChange }: { filters: ProjectFilters; viewMode: ProjectViewMode; onFiltersChange: (filters: ProjectFilters) => void; onViewModeChange: (mode: ProjectViewMode) => void }) {
  const { t } = useI18n();

  return (
    <div className="glass-panel rounded-2xl p-3">
      <div className="grid gap-3 xl:grid-cols-[1fr_repeat(4,180px)_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={filters.query} onChange={(event) => onFiltersChange({ ...filters, query: event.target.value })} className="pl-9" placeholder={t("projects.searchPlaceholder")} />
        </div>
        <Select value={filters.language} onChange={(event) => onFiltersChange({ ...filters, language: event.target.value })}>
          <option value="all">{t("projects.allLanguages")}</option>{projectLanguages.map((item) => <option key={item}>{item}</option>)}
        </Select>
        <Select value={filters.country} onChange={(event) => onFiltersChange({ ...filters, country: event.target.value })}>
          <option value="all">{t("projects.allCountries")}</option>{projectCountries.map((item) => <option key={item}>{item}</option>)}
        </Select>
        <Select value={filters.industry} onChange={(event) => onFiltersChange({ ...filters, industry: event.target.value })}>
          <option value="all">{t("projects.allIndustries")}</option>{projectIndustries.map((item) => <option key={item}>{item}</option>)}
        </Select>
        <Select value={filters.sort} onChange={(event) => onFiltersChange({ ...filters, sort: event.target.value as ProjectSortKey })}>
          <option value="createdAt">{t("projects.createTime")}</option><option value="lastAnalysisAt">{t("projects.lastAnalysis")}</option><option value="name">{t("projects.name")}</option>
        </Select>
        <div className="flex rounded-xl border border-white/10 bg-background/50 p-1">
          <Button variant="ghost" size="icon" className={cn(viewMode === "card" && "bg-white/10")} onClick={() => onViewModeChange("card")} aria-label={t("projects.cardView")}><Grid2X2 className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className={cn(viewMode === "list" && "bg-white/10")} onClick={() => onViewModeChange("list")} aria-label={t("projects.listView")}><List className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
}

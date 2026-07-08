"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import type { Project, ProjectFormValues, ProjectViewMode } from "@/types/project";
import { createMockProject, mockProjects } from "@/data/projects";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page";
import { ProjectForm } from "@/features/projects/project-form";
import { ProjectEmptyResults, ProjectStats } from "@/features/projects/project-stats";
import { type ProjectFilters, ProjectToolbar } from "@/features/projects/project-toolbar";
import { ProjectCard, ProjectList } from "@/features/projects/project-views";

const defaultFilters: ProjectFilters = {
  query: "",
  language: "all",
  country: "all",
  industry: "all",
  sort: "createdAt",
};

export function ProjectManagement() {
  const { t } = useI18n();
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [filters, setFilters] = useState<ProjectFilters>(defaultFilters);
  const [viewMode, setViewMode] = useState<ProjectViewMode>("card");
  const [activeProject, setActiveProject] = useState<Project | undefined>();
  const [panelMode, setPanelMode] = useState<"closed" | "create" | "edit">("closed");

  const filteredProjects = useMemo(() => {
    return projects
      .filter((project) => {
        const query = filters.query.trim().toLowerCase();
        const matchesQuery = !query || [project.name, project.websiteUrl, project.description].some((value) => value.toLowerCase().includes(query));
        const matchesLanguage = filters.language === "all" || project.language === filters.language;
        const matchesCountry = filters.country === "all" || project.country === filters.country;
        const matchesIndustry = filters.industry === "all" || project.industry === filters.industry;

        return matchesQuery && matchesLanguage && matchesCountry && matchesIndustry;
      })
      .toSorted((left, right) => {
        if (filters.sort === "name") return left.name.localeCompare(right.name);
        if (filters.sort === "lastAnalysisAt") return new Date(right.lastAnalysisAt ?? 0).getTime() - new Date(left.lastAnalysisAt ?? 0).getTime();
        return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      });
  }, [filters, projects]);

  function closePanel() {
    setPanelMode("closed");
    setActiveProject(undefined);
  }

  function handleCreate(values: ProjectFormValues) {
    setProjects((currentProjects) => [createMockProject(values), ...currentProjects]);
    closePanel();
  }

  function handleEdit(project: Project) {
    setActiveProject(project);
    setPanelMode("edit");
  }

  function handleUpdate(values: ProjectFormValues) {
    if (!activeProject) return;
    setProjects((currentProjects) => currentProjects.map((project) => (project.id === activeProject.id ? { ...project, ...values } : project)));
    closePanel();
  }

  function handleDelete(projectToDelete: Project) {
    setProjects((currentProjects) => currentProjects.filter((project) => project.id !== projectToDelete.id));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("projects.title")}
        description={t("projects.description")}
        action={<Button onClick={() => setPanelMode("create")}><Plus className="h-4 w-4" /> {t("projects.newProject")}</Button>}
      />

      <ProjectStats projects={projects} labels={{ totalProjects: t("projects.totalProjects"), totalReports: t("projects.totalReports"), lastAnalysis: t("projects.lastAnalysis"), averageGeoScore: t("projects.averageGeoScore"), mockData: t("common.mockData"), allProjects: t("dashboard.allProjects"), latest: t("common.latest"), fakeScore: t("dashboard.fakeScore") }} />

      {panelMode !== "closed" ? (
        <Card className="glass-panel border-primary/20">
          <CardHeader>
            <CardTitle>{panelMode === "create" ? t("projects.createProject") : t("projects.editProject", { name: activeProject?.name ?? "" })}</CardTitle>
          </CardHeader>
          <CardContent>
            <ProjectForm project={activeProject} onSubmit={panelMode === "create" ? handleCreate : handleUpdate} onCancel={closePanel} />
          </CardContent>
        </Card>
      ) : null}

      <ProjectToolbar filters={filters} viewMode={viewMode} onFiltersChange={setFilters} onViewModeChange={setViewMode} />

      {filteredProjects.length === 0 ? <ProjectEmptyResults title={t("projects.noResults")} description={t("projects.noResultsDescription")} /> : null}

      {filteredProjects.length > 0 && viewMode === "card" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredProjects.map((project) => <ProjectCard key={project.id} project={project} onEdit={handleEdit} onDelete={handleDelete} />)}
        </div>
      ) : null}

      {filteredProjects.length > 0 && viewMode === "list" ? <ProjectList projects={filteredProjects} onEdit={handleEdit} onDelete={handleDelete} /> : null}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import type { Project, ProjectFormValues, ProjectViewMode } from "@/types/project";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page";
import { OperationFeedback, type OperationStatus } from "@/components/shared/operation-feedback";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
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

async function readProjectResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const data = text ? JSON.parse(text) as T & { error?: string } : {} as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "项目数据请求失败");
  return data;
}

export function ProjectManagement() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [filters, setFilters] = useState<ProjectFilters>(defaultFilters);
  const [viewMode, setViewMode] = useState<ProjectViewMode>("card");
  const [activeProject, setActiveProject] = useState<Project | undefined>();
  const [panelMode, setPanelMode] = useState<"closed" | "create" | "edit">("closed");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [operation, setOperation] = useState<{ status: OperationStatus; message: string } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Project | null>(null);

  async function loadProjects() {
    setLoading(true);
    setError(null);
    try {
      const data = await readProjectResponse<{ projects: Project[] }>(await fetch("/api/projects", { cache: "no-store" }));
      setProjects(data.projects);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "项目数据加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProjects();
  }, []);

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

  async function handleCreate(values: ProjectFormValues) {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    setOperation({ status: "CREATING", message: locale === "zh" ? "正在验证项目资料并创建独立工作空间。" : "Validating project details and creating an isolated workspace." });
    try {
      const data = await readProjectResponse<{ project: Project }>(await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) }));
      setProjects((currentProjects) => [data.project, ...currentProjects]);
      setOperation({ status: "COMPLETED", message: locale === "zh" ? `项目“${data.project.name}”已创建。` : `Project “${data.project.name}” was created.` });
      closePanel();
      router.push(`/projects/${data.project.id}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "项目创建失败");
      setOperation({ status: "FAILED", message: requestError instanceof Error ? requestError.message : (locale === "zh" ? "项目创建失败。" : "Project creation failed.") });
    } finally {
      setSubmitting(false);
    }
  }

  function handleEdit(project: Project) {
    setActiveProject(project);
    setPanelMode("edit");
  }

  async function handleUpdate(values: ProjectFormValues) {
    if (!activeProject || submitting) return;
    setSubmitting(true);
    setError(null);
    setOperation({ status: "VALIDATING", message: locale === "zh" ? "正在保存项目设置。" : "Saving project settings." });
    try {
      const data = await readProjectResponse<{ project: Project }>(await fetch(`/api/projects/${activeProject.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) }));
      setProjects((currentProjects) => currentProjects.map((project) => (project.id === activeProject.id ? data.project : project)));
      setOperation({ status: "COMPLETED", message: locale === "zh" ? "项目设置已保存。" : "Project settings were saved." });
      closePanel();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "项目更新失败");
      setOperation({ status: "FAILED", message: requestError instanceof Error ? requestError.message : (locale === "zh" ? "项目更新失败。" : "Project update failed.") });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(projectToDelete: Project) {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    setOperation({ status: "RUNNING", message: locale === "zh" ? `正在删除项目“${projectToDelete.name}”及其隔离数据。` : `Deleting “${projectToDelete.name}” and its isolated data.` });
    try {
      await readProjectResponse<{ deleted: boolean }>(await fetch(`/api/projects/${projectToDelete.id}`, { method: "DELETE" }));
      setProjects((currentProjects) => currentProjects.filter((project) => project.id !== projectToDelete.id));
      setPendingDelete(null);
      setOperation({ status: "COMPLETED", message: locale === "zh" ? "项目已删除。" : "Project deleted." });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "项目删除失败");
      setOperation({ status: "FAILED", message: requestError instanceof Error ? requestError.message : (locale === "zh" ? "项目删除失败。" : "Project deletion failed.") });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("projects.title")}
        description={t("projects.description")}
        action={<Button onClick={() => setPanelMode("create")}><Plus className="h-4 w-4" /> {t("projects.newProject")}</Button>}
      />

      {error ? <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}
      {operation ? <OperationFeedback status={operation.status} message={operation.message} /> : null}

      {loading ? (
        <Card className="glass-panel border-white/10">
          <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> 正在加载当前账号的项目数据...</CardContent>
        </Card>
      ) : null}

      {!loading ? <ProjectStats projects={projects} labels={{ totalProjects: t("projects.totalProjects"), totalReports: t("projects.totalReports"), lastAnalysis: t("projects.lastAnalysis"), averageGeoScore: t("projects.averageGeoScore"), mockData: "当前账号", allProjects: t("dashboard.allProjects"), latest: t("common.latest"), fakeScore: "实时统计" }} /> : null}

      {panelMode !== "closed" ? (
        <Card className="glass-panel border-primary/20">
          <CardHeader>
            <CardTitle>{panelMode === "create" ? t("projects.createProject") : t("projects.editProject", { name: activeProject?.name ?? "" })}</CardTitle>
          </CardHeader>
          <CardContent>
            <ProjectForm project={activeProject} onSubmit={panelMode === "create" ? handleCreate : handleUpdate} onCancel={closePanel} submitting={submitting} />
          </CardContent>
        </Card>
      ) : null}

      {!loading ? <ProjectToolbar filters={filters} viewMode={viewMode} onFiltersChange={setFilters} onViewModeChange={setViewMode} /> : null}

      {!loading && filteredProjects.length === 0 ? <ProjectEmptyResults title={t("projects.noResults")} description={t("projects.noResultsDescription")} /> : null}

      {filteredProjects.length > 0 && viewMode === "card" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredProjects.map((project) => <ProjectCard key={project.id} project={project} onEdit={handleEdit} onDelete={setPendingDelete} />)}
        </div>
      ) : null}

      {filteredProjects.length > 0 && viewMode === "list" ? <ProjectList projects={filteredProjects} onEdit={handleEdit} onDelete={setPendingDelete} /> : null}

      <Dialog open={Boolean(pendingDelete)} onOpenChange={open => { if (!open && !submitting) setPendingDelete(null); }}>
        <DialogContent>
          <DialogTitle className="pr-12 text-lg font-semibold">
            {locale === "zh" ? "确认删除项目" : "Delete project?"}
          </DialogTitle>
          <DialogDescription className="mt-3 text-sm leading-6 text-muted-foreground">
            {locale === "zh"
              ? `项目“${pendingDelete?.name ?? ""}”及其扫描、知识、监控和增长数据将被永久删除。`
              : `“${pendingDelete?.name ?? ""}” and its scans, knowledge, monitoring, and growth data will be permanently deleted.`}
          </DialogDescription>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <DialogClose asChild>
              <Button variant="outline" className="min-h-11" disabled={submitting}>{locale === "zh" ? "取消" : "Cancel"}</Button>
            </DialogClose>
            <Button
              variant="destructive"
              className="min-h-11"
              disabled={!pendingDelete || submitting}
              onClick={() => pendingDelete && void handleDelete(pendingDelete)}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Trash2 className="h-4 w-4" />}
              {locale === "zh" ? "确认删除" : "Delete project"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

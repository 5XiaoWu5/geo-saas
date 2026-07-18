"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, BookOpen, Building2, Loader2, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/i18n/provider";
import type { KnowledgeOverviewResponse, KnowledgeProjectSummary } from "../types";

async function responseJson<T>(response: Response) {
  const data = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "REQUEST_FAILED");
  return data;
}

function Score({ value }: { value: number | null | undefined }) {
  return <span className="font-mono text-sm">{typeof value === "number" ? `${value}/100` : "--"}</span>;
}

export function KnowledgeOverview() {
  const { t } = useI18n();
  const [projects, setProjects] = useState<KnowledgeProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const session = await responseJson<{ user: { id: string } | null }>(await fetch("/api/auth/session", { cache: "no-store" }));
    if (!session.user) {
      setError("UNAUTHORIZED");
      setProjects([]);
      return;
    }
    const data = await responseJson<KnowledgeOverviewResponse>(await fetch("/api/knowledge", { cache: "no-store" }));
    setProjects(data.projects);
  }, []);

  useEffect(() => { load().catch((requestError) => setError(requestError instanceof Error ? requestError.message : "REQUEST_FAILED")).finally(() => setLoading(false)); }, [load]);

  async function create(projectId: string) {
    setCreating(projectId);
    setError("");
    try {
      await responseJson(await fetch("/api/knowledge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId }) }));
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "REQUEST_FAILED");
    } finally {
      setCreating("");
    }
  }

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <PageHeader title={t("knowledge.title")} description={t("knowledge.description")} />
      {error ? <p className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{t(`knowledge.errors.${error}`) === `knowledge.errors.${error}` ? t("knowledge.errors.REQUEST_FAILED") : t(`knowledge.errors.${error}`)}</p> : null}
      {loading ? <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{t("knowledge.loading")}</div> : null}
      {!loading && !projects.length ? <Card className="border-white/10 bg-white/[0.03]"><CardContent className="p-8 text-center"><BookOpen className="mx-auto h-8 w-8 text-primary" /><p className="mt-3 font-medium">{t("knowledge.noProjects")}</p></CardContent></Card> : null}
      {!loading && projects.length ? <>
        <div className="grid gap-4 md:hidden">{projects.map((project) => <ProjectCard key={project.projectId} project={project} creating={creating === project.projectId} onCreate={() => void create(project.projectId)} />)}</div>
        <Card className="hidden overflow-hidden border-white/10 bg-white/[0.03] md:block"><CardContent className="p-0"><div className="grid grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_auto] gap-4 border-b border-white/10 px-5 py-3 text-xs text-muted-foreground"><span>{t("knowledge.project")}</span><span>{t("knowledge.completeness")}</span><span>{t("knowledge.understanding")}</span><span>{t("knowledge.assets")}</span><span>{t("common.actions")}</span></div>{projects.map((project) => <div key={project.projectId} className="grid grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_auto] items-center gap-4 border-b border-white/5 px-5 py-4 last:border-0"><div className="min-w-0"><p className="truncate font-medium">{project.projectName}</p><p className="truncate text-xs text-muted-foreground">{project.websiteUrl}</p></div><Score value={project.knowledgeBase?.completenessScore} /><Score value={project.knowledgeBase?.understandingScore} /><span className="text-sm text-muted-foreground">{project.productCount + project.serviceCount + project.caseCount + project.documentCount}</span><ProjectAction project={project} creating={creating === project.projectId} onCreate={() => void create(project.projectId)} /></div>)}</CardContent></Card>
      </> : null}
    </div>
  );
}

function ProjectAction({ project, creating, onCreate }: { project: KnowledgeProjectSummary; creating: boolean; onCreate: () => void }) {
  const { t } = useI18n();
  return project.knowledgeBase ? <Button asChild variant="outline" className="min-h-11"><Link href={`/projects/${project.projectId}/knowledge`}>{t("knowledge.open")}<ArrowRight className="h-4 w-4" /></Link></Button> : <Button type="button" className="min-h-11" disabled={creating} onClick={onCreate}>{creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}{t("knowledge.createBase")}</Button>;
}

function ProjectCard({ project, creating, onCreate }: { project: KnowledgeProjectSummary; creating: boolean; onCreate: () => void }) {
  const { t } = useI18n();
  return <Card className="min-w-0 border-white/10 bg-white/[0.03]"><CardContent className="min-w-0 p-4"><div className="flex min-w-0 items-start gap-3"><Building2 className="mt-1 h-5 w-5 shrink-0 text-primary" /><div className="min-w-0 flex-1"><p className="break-words font-medium">{project.projectName}</p><p className="break-all text-xs text-muted-foreground">{project.websiteUrl}</p></div><Badge variant={project.knowledgeBase ? "success" : "muted"}>{project.knowledgeBase ? t("knowledge.ready") : t("knowledge.notCreated")}</Badge></div><div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs text-muted-foreground">{t("knowledge.completeness")}</p><Score value={project.knowledgeBase?.completenessScore} /></div><div><p className="text-xs text-muted-foreground">{t("knowledge.understanding")}</p><Score value={project.knowledgeBase?.understandingScore} /></div><div><p className="text-xs text-muted-foreground">{t("knowledge.products")}</p><p>{project.productCount}</p></div><div><p className="text-xs text-muted-foreground">{t("knowledge.cases")}</p><p>{project.caseCount}</p></div></div><div className="mt-4"><ProjectAction project={project} creating={creating} onCreate={onCreate} /></div></CardContent></Card>;
}

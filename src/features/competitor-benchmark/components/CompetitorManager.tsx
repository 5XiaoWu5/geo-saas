"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Building2, Globe2, Loader2, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/i18n/provider";
import type { CompetitorProfile, CompetitorWorkspaceResponse } from "../types";
import { CompetitorCard } from "./CompetitorCard";
import { CompetitorCreateForm } from "./CompetitorCreateForm";

async function responseJson<T>(response: Response) {
  const data = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "REQUEST_FAILED");
  return data;
}

export function CompetitorManager({ projectId }: { projectId: string }) {
  const { t } = useI18n();
  const [competitors, setCompetitors] = useState<CompetitorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    const data = await responseJson<CompetitorWorkspaceResponse>(await fetch(`/api/competitors?projectId=${encodeURIComponent(projectId)}`, { cache: "no-store" }));
    setCompetitors(data.competitors);
  }, [projectId]);

  useEffect(() => {
    let mounted = true;
    load().catch((requestError) => { if (mounted) setError(requestError instanceof Error ? requestError.message : "REQUEST_FAILED"); }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [load]);

  async function remove(competitor: CompetitorProfile) {
    if (!window.confirm(t("competitors.deleteConfirm").replace("{name}", competitor.name))) return;
    setDeletingId(competitor.id);
    setError("");
    try {
      await responseJson<{ deleted: true }>(await fetch(`/api/competitors/${competitor.id}`, { method: "DELETE" }));
      setCompetitors((current) => current.filter((item) => item.id !== competitor.id));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "REQUEST_FAILED");
    } finally {
      setDeletingId("");
    }
  }

  const translatedError = error ? t(`competitors.errors.${error}`) : "";
  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <PageHeader title={t("competitors.title")} description={t("competitors.description")} />
      <CompetitorCreateForm projectId={projectId} onCreated={(competitor) => setCompetitors((current) => [competitor, ...current])} />
      {error ? <div className="flex gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"><AlertCircle className="h-4 w-4 shrink-0" />{translatedError === `competitors.errors.${error}` ? t("competitors.errors.REQUEST_FAILED") : translatedError}</div> : null}
      {loading ? <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{t("competitors.loading")}</div> : competitors.length ? <>
        <div className="grid gap-4 md:hidden">{competitors.map((competitor) => <CompetitorCard key={competitor.id} competitor={competitor} deleting={deletingId === competitor.id} onDelete={() => void remove(competitor)} />)}</div>
        <Card className="glass-panel hidden overflow-hidden border-white/10 md:block"><CardContent className="p-0"><div className="grid grid-cols-[1.2fr_1fr_1fr_0.8fr_auto] gap-4 border-b border-white/10 px-5 py-3 text-xs font-medium text-muted-foreground"><span>{t("competitors.name")}</span><span>{t("competitors.domain")}</span><span>{t("competitors.industry")}</span><span>{t("competitors.region")}</span><span>{t("common.actions")}</span></div>{competitors.map((competitor) => <div key={competitor.id} className="grid grid-cols-[1.2fr_1fr_1fr_0.8fr_auto] items-center gap-4 border-b border-white/5 px-5 py-4 last:border-0"><div className="min-w-0"><div className="flex items-center gap-2"><Building2 className="h-4 w-4 shrink-0 text-primary" /><span className="truncate font-medium">{competitor.name}</span></div><Badge className="mt-2" variant={competitor.status === "ACTIVE" ? "success" : "muted"}>{t(`competitors.statuses.${competitor.status}`)}</Badge></div><a href={`https://${competitor.domain}`} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground hover:text-primary"><Globe2 className="h-4 w-4 shrink-0" /><span className="truncate">{competitor.domain}</span></a><span className="truncate text-sm text-muted-foreground">{competitor.industry || t("competitors.unavailable")}</span><span className="truncate text-sm text-muted-foreground">{competitor.region || t("competitors.unavailable")}</span><Button type="button" variant="ghost" size="icon" title={t("competitors.delete")} disabled={deletingId === competitor.id} onClick={() => void remove(competitor)}>{deletingId === competitor.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}</Button></div>)}</CardContent></Card>
      </> : <Card className="glass-panel border-white/10"><CardContent className="p-6 text-center"><Building2 className="mx-auto h-8 w-8 text-primary" /><p className="mt-3 font-medium">{t("competitors.empty")}</p><p className="mt-2 text-sm text-muted-foreground">{t("competitors.emptyDescription")}</p></CardContent></Card>}
    </div>
  );
}

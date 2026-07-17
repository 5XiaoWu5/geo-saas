"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowRight, FlaskConical, Loader2, Play, Radar } from "lucide-react";
import { PageHeader } from "@/components/shared/page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n/provider";
import { ProviderTabs } from "./components/ProviderTabs";
import { RecommendationPanel } from "./components/RecommendationPanel";
import { SimulationHistory } from "./components/SimulationHistory";
import { SimulatorCard } from "./components/SimulatorCard";
import { SIMULATION_PROVIDERS, type SimulationProviderName, type SimulatorWorkspaceResponse } from "./types";

type Props = {
  initialProjectId?: string;
  initialCampaignId?: string;
  initialQueryId?: string;
};

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  const data = text ? JSON.parse(text) as T & { error?: string } : {} as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "REQUEST_FAILED");
  return data;
}

function historyUrl(projectId?: string, campaignId?: string, queryId?: string) {
  const params = new URLSearchParams();
  if (projectId) params.set("projectId", projectId);
  if (campaignId) params.set("campaignId", campaignId);
  if (queryId) params.set("queryId", queryId);
  return `/api/simulator/history${params.size ? `?${params.toString()}` : ""}`;
}

export function SimulatorWorkspace({ initialProjectId, initialCampaignId, initialQueryId }: Props) {
  const { t } = useI18n();
  const [data, setData] = useState<SimulatorWorkspaceResponse | null>(null);
  const [projectId, setProjectId] = useState(initialProjectId ?? "");
  const [campaignId, setCampaignId] = useState(initialCampaignId ?? "");
  const [queryId, setQueryId] = useState(initialQueryId ?? "");
  const [query, setQuery] = useState("");
  const [providers, setProviders] = useState<SimulationProviderName[]>(["ChatGPT", "Gemini", "Claude"]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (nextProjectId?: string, nextCampaignId?: string, nextQueryId?: string) => {
    const result = await readJson<SimulatorWorkspaceResponse>(await fetch(historyUrl(nextProjectId, nextCampaignId, nextQueryId), { cache: "no-store" }));
    setData(result);
    setProjectId(result.selectedProjectId ?? "");
    setCampaignId(result.selectedCampaignId ?? "");
    setQueryId(result.selectedQueryId ?? "");
    const selectedQuery = result.queries.find((item) => item.id === result.selectedQueryId);
    if (selectedQuery) setQuery(selectedQuery.query);
  }, []);

  useEffect(() => {
    let mounted = true;
    load(initialProjectId, initialCampaignId, initialQueryId)
      .catch((requestError) => { if (mounted) setError(requestError instanceof Error ? requestError.message : "REQUEST_FAILED"); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [initialCampaignId, initialProjectId, initialQueryId, load]);

  const campaigns = useMemo(() => data?.campaigns.filter((campaign) => campaign.projectId === projectId) ?? [], [data?.campaigns, projectId]);
  const queries = useMemo(() => data?.queries.filter((item) => !campaignId || item.campaignId === campaignId) ?? [], [campaignId, data?.queries]);
  const activeResult = data?.latest.find((record) => providers.includes(record.provider)) ?? data?.latest[0] ?? null;
  const errorMessage = error ? (() => {
    const key = `simulator.errors.${error}`;
    const translated = t(key);
    return translated === key ? error : translated;
  })() : "";

  async function changeProject(nextProjectId: string) {
    setProjectId(nextProjectId);
    setCampaignId("");
    setQueryId("");
    setQuery("");
    setLoading(true);
    setError("");
    try { await load(nextProjectId); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "REQUEST_FAILED"); } finally { setLoading(false); }
  }

  function changeCampaign(nextCampaignId: string) {
    setCampaignId(nextCampaignId);
    const firstQuery = data?.queries.find((item) => item.campaignId === nextCampaignId);
    setQueryId(firstQuery?.id ?? "");
    setQuery(firstQuery?.query ?? "");
  }

  function changeQuery(nextQueryId: string) {
    setQueryId(nextQueryId);
    const selected = data?.queries.find((item) => item.id === nextQueryId);
    if (selected) setQuery(selected.query);
  }

  async function run() {
    setRunning(true);
    setError("");
    try {
      await readJson(await fetch("/api/simulator/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, campaignId: campaignId || null, queryId: queryId || null, query, providers }),
      }));
      await load(projectId, campaignId, queryId);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "REQUEST_FAILED");
    } finally {
      setRunning(false);
    }
  }

  if (loading && !data) {
    return <div><PageHeader title={t("simulator.title")} description={t("simulator.description")} /><div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> {t("simulator.loading")}</div></div>;
  }

  const projects = data?.projects ?? [];
  return (
    <div className="min-w-0 space-y-6">
      <PageHeader title={t("simulator.title")} description={t("simulator.description")} action={<Button asChild variant="outline"><Link href="/campaigns">{t("simulator.openCampaigns")} <ArrowRight className="h-4 w-4" /></Link></Button>} />

      {errorMessage ? <div className="flex gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"><AlertCircle className="h-4 w-4 shrink-0" /><span className="break-words">{errorMessage}</span></div> : null}

      {projects.length === 0 ? (
        <Card className="glass-panel border-white/10"><CardContent className="p-6"><p className="text-sm text-muted-foreground">{t("simulator.noProjects")}</p><Button asChild className="mt-4"><Link href="/projects">{t("simulator.goToProjects")}</Link></Button></CardContent></Card>
      ) : (
        <>
          <Card className="glass-panel border-white/10">
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><FlaskConical className="h-5 w-5 text-primary" /> {t("simulator.configuration")}</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-3">
                <Field label={t("simulator.project")}><select value={projectId} onChange={(event) => void changeProject(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">{t("simulator.selectProject")}</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></Field>
                <Field label={t("simulator.campaign")}><select value={campaignId} onChange={(event) => changeCampaign(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">{t("simulator.manualQuery")}</option>{campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}</select></Field>
                <Field label={t("simulator.query")}><select value={queryId} onChange={(event) => changeQuery(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">{t("simulator.manualQuery")}</option>{queries.map((item) => <option key={item.id} value={item.id}>{item.query}</option>)}</select></Field>
              </div>

              <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
                <Field label={t("simulator.queryInput")}><Textarea value={query} onChange={(event) => { setQuery(event.target.value); if (queryId) setQueryId(""); }} placeholder={t("simulator.queryPlaceholder")} className="min-h-28 w-full resize-y" /></Field>
                <div className="min-w-0"><Label>{t("simulator.providers")}</Label><div className="mt-2"><ProviderTabs selected={providers} onChange={setProviders} /></div><p className="mt-2 text-xs text-muted-foreground">{t("simulator.ruleBasedNotice")}</p></div>
              </div>

              <div className="flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Radar className="h-4 w-4 text-primary" /> {t("simulator.realSignalsOnly")}</div>
                <Button onClick={() => void run()} disabled={running || !projectId || query.trim().length < 3 || providers.length === 0} className="w-full sm:w-auto">
                  {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} {running ? t("simulator.running") : t("simulator.run")}
                </Button>
              </div>
            </CardContent>
          </Card>

          {data?.latest.length ? (
            <section className="space-y-5">
              <div><h2 className="text-xl font-semibold text-foreground">{t("simulator.latestResults")}</h2><p className="mt-1 text-sm text-muted-foreground">{t("simulator.latestResultsDescription")}</p></div>
              <div className="grid min-w-0 gap-5 md:grid-cols-2 xl:grid-cols-3">{data.latest.map((record) => <SimulatorCard key={record.id} record={record} />)}</div>
              {activeResult?.result ? <RecommendationPanel result={activeResult.result} /> : null}
            </section>
          ) : null}

          <SimulationHistory records={data?.history ?? []} />
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="min-w-0"><Label>{label}</Label><div className="mt-2">{children}</div></div>;
}

export const simulatorProviders = SIMULATION_PROVIDERS;


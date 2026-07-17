"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowRight, Loader2, Play, PlusCircle } from "lucide-react";
import { PageHeader } from "@/components/shared/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/i18n/provider";
import { getHostname } from "@/lib/format";
import { CampaignCreateForm } from "./components/CampaignCreateForm";
import { CampaignOverview } from "./components/CampaignOverview";
import { GrowthChart } from "./components/GrowthChart";
import { QueryClusterTable } from "./components/QueryClusterTable";
import type { GeoCampaignCreateInput, GeoCampaignWorkspaceResponse } from "./types";

type Props = {
  initialProjectId?: string;
  initialCampaignId?: string;
};

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  const data = text ? (JSON.parse(text) as T & { error?: string }) : ({} as T & { error?: string });
  if (!response.ok) throw new Error(data.error ?? "REQUEST_FAILED");
  return data;
}

function buildCampaignUrl(projectId: string, campaignId?: string) {
  const params = new URLSearchParams();
  if (projectId) params.set("projectId", projectId);
  if (campaignId) params.set("campaignId", campaignId);
  return `/api/campaign${params.toString() ? `?${params.toString()}` : ""}`;
}

export function CampaignWorkspace({ initialProjectId, initialCampaignId }: Props) {
  const { t } = useI18n();
  const [data, setData] = useState<GeoCampaignWorkspaceResponse | null>(null);
  const [projectId, setProjectId] = useState(initialProjectId ?? "");
  const [selectedCampaignId, setSelectedCampaignId] = useState(initialCampaignId ?? "");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const loadCampaigns = useCallback(async (nextProjectId?: string, nextCampaignId?: string) => {
    const result = await readJson<GeoCampaignWorkspaceResponse>(await fetch(buildCampaignUrl(nextProjectId ?? "", nextCampaignId ?? ""), { cache: "no-store" }));
    setData(result);
    setProjectId(result.selectedProjectId ?? "");
    setSelectedCampaignId(result.selectedCampaignId ?? "");
  }, []);

  useEffect(() => {
    let mounted = true;
    loadCampaigns(initialProjectId, initialCampaignId)
      .catch((requestError) => {
        if (mounted) setError(requestError instanceof Error ? requestError.message : "REQUEST_FAILED");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [initialCampaignId, initialProjectId, loadCampaigns]);

  const activeCampaign = useMemo(
    () => data?.campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? data?.campaigns[0] ?? null,
    [data?.campaigns, selectedCampaignId],
  );
  const activeProject = useMemo(
    () => data?.projects.find((project) => project.id === projectId) ?? data?.projects[0] ?? null,
    [data?.projects, projectId],
  );
  const errorMessage = useMemo(() => {
    if (!error) return "";
    const key = `campaigns.errors.${error}`;
    const translated = t(key);
    return translated === key ? error : translated;
  }, [error, t]);

  async function createCampaign(input: GeoCampaignCreateInput) {
    setCreating(true);
    setError("");
    try {
      const created = await readJson<{ campaign: { id: string } }>(
        await fetch("/api/campaign/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        }),
      );
      await readJson(
        await fetch("/api/campaign/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ campaignId: created.campaign.id, targetCustomers: input.targetCustomers, queryCount: input.queryCount }),
        }),
      );
      await loadCampaigns(input.projectId, created.campaign.id);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "REQUEST_FAILED");
    } finally {
      setCreating(false);
    }
  }

  async function generateQueries() {
    if (!activeCampaign) return;
    setGenerating(true);
    setError("");
    try {
      await readJson(
        await fetch("/api/campaign/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ campaignId: activeCampaign.id, queryCount: activeCampaign.queryCount }),
        }),
      );
      await loadCampaigns(activeCampaign.projectId, activeCampaign.id);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "REQUEST_FAILED");
    } finally {
      setGenerating(false);
    }
  }

  function selectProject(nextProjectId: string) {
    setProjectId(nextProjectId);
    setSelectedCampaignId("");
    void loadCampaigns(nextProjectId, "");
  }

  if (loading) {
    return (
      <div>
        <PageHeader title={t("campaigns.title")} description={t("campaigns.description")} />
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> {t("campaigns.loading")}
        </div>
      </div>
    );
  }

  const projects = data?.projects ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title={t("campaigns.title")} description={t("campaigns.description")} />

      {errorMessage ? (
        <div className="flex gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" /> {errorMessage}
        </div>
      ) : null}

      {projects.length === 0 ? (
        <Card className="glass-panel border-white/10">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">{t("campaigns.noProjects")}</p>
            <Button asChild className="mt-4">
              <Link href="/projects">{t("campaigns.goToProjects")}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <CampaignOverview summary={data?.summary ?? emptySummary()} activeCampaign={activeCampaign} />

          <Card className="glass-panel border-white/10">
            <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-lg font-semibold text-foreground">{activeProject?.name ?? t("campaigns.selectedProject")}</p>
                <p className="mt-1 break-all text-sm text-muted-foreground">{activeProject ? getHostname(activeProject.websiteUrl) : t("campaigns.selectProject")}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline">
                  <Link href={projectId ? `/projects/${projectId}` : "/projects"}>{t("campaigns.projectDetail")}</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/visibility">{t("campaigns.visibilityEngine")}</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <CampaignCreateForm
              projects={projects}
              selectedProjectId={projectId}
              submitting={creating}
              onProjectChange={selectProject}
              onSubmit={(input) => void createCampaign(input)}
            />
            <CampaignList
              campaigns={data?.campaigns ?? []}
              selectedCampaignId={selectedCampaignId}
              onSelect={(campaignId) => {
                setSelectedCampaignId(campaignId);
                const campaign = data?.campaigns.find((item) => item.id === campaignId);
                if (campaign) setProjectId(campaign.projectId);
              }}
            />
          </section>

          {activeCampaign ? (
            <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-6">
                <Card className="glass-panel border-white/10">
                  <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-lg font-semibold text-foreground">{t("campaigns.campaignDetail")}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{t("campaigns.autoVisibilityDescription")}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => void generateQueries()} disabled={generating}>
                        {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                        {t("campaigns.generateQueries")}
                      </Button>
                      <Button asChild variant="outline">
                        <Link href={`/campaigns/${activeCampaign.id}`}>
                          {t("campaigns.openDetail")} <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                <QueryClusterTable clusters={activeCampaign.clusters} queries={activeCampaign.queries} />
              </div>
              <GrowthChart trend={activeCampaign.trend} />
            </section>
          ) : (
            <Card className="glass-panel border-white/10">
              <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
                <PlusCircle className="h-4 w-4" /> {t("campaigns.noCampaigns")}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function CampaignList({ campaigns, selectedCampaignId, onSelect }: { campaigns: GeoCampaignWorkspaceResponse["campaigns"]; selectedCampaignId: string; onSelect: (campaignId: string) => void }) {
  const { t } = useI18n();
  return (
    <Card className="glass-panel border-white/10">
      <CardHeader>
        <CardTitle className="text-lg">{t("campaigns.campaignList")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {campaigns.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-muted-foreground">{t("campaigns.noCampaigns")}</p>
        ) : (
          campaigns.map((campaign) => (
            <button
              key={campaign.id}
              onClick={() => onSelect(campaign.id)}
              className={`w-full rounded-2xl border p-4 text-left transition ${campaign.id === selectedCampaignId ? "border-primary/40 bg-primary/10" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"}`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="break-words text-sm font-medium text-foreground">{campaign.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{campaign.industry}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Badge variant="outline">{campaign.queries.length}/{campaign.queryCount}</Badge>
                  <Badge variant={campaign.score.visibilityRate > 0 ? "success" : "muted"}>{campaign.score.visibilityRate}%</Badge>
                </div>
              </div>
            </button>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function emptySummary() {
  return {
    totalCampaigns: 0,
    totalQueries: 0,
    totalChecks: 0,
    brandMentions: 0,
    aiExposureRate: 0,
    averageMentionPosition: null,
    averageScore: 0,
    queryCoverage: 0,
    growthDelta: 0,
  };
}

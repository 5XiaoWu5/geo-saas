"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ArrowLeft, Award, BrainCircuit, BriefcaseBusiness, CheckCircle2, FileQuestion, Loader2, Package, RefreshCw, ShieldCheck, Target, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useI18n } from "@/i18n/provider";
import type { KnowledgeGap, KnowledgeIntelligenceResponse, KnowledgeProfileItem } from "../types";

async function responseJson(response: Response) {
  const data = await response.json() as KnowledgeIntelligenceResponse & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "REQUEST_FAILED");
  return data;
}

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return <div className="min-w-0 border-l-2 border-primary/40 pl-4"><div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div><p className="mt-2 font-mono text-2xl font-semibold">{value}</p></div>;
}

export function KnowledgeIntelligenceWorkspace({ projectId }: { projectId: string }) {
  const { t } = useI18n();
  const [data, setData] = useState<KnowledgeIntelligenceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => responseJson(await fetch(`/api/knowledge/${projectId}/profile`, { cache: "no-store" })), [projectId]);
  useEffect(() => { load().then(setData).catch((requestError) => setError(requestError instanceof Error ? requestError.message : "REQUEST_FAILED")).finally(() => setLoading(false)); }, [load]);

  async function analyze() {
    setAnalyzing(true);
    setError("");
    try {
      setData(await responseJson(await fetch(`/api/knowledge/${projectId}/analyze`, { method: "POST" })));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "REQUEST_FAILED");
    } finally {
      setAnalyzing(false);
    }
  }

  if (loading) return <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{t("knowledge.intelligence.loading")}</div>;
  if (!data) return <div><PageHeader title={t("knowledge.intelligence.title")} description={t("knowledge.intelligence.description")} /><p className="border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{t(`knowledge.errors.${error}`) === `knowledge.errors.${error}` ? t("knowledge.errors.REQUEST_FAILED") : t(`knowledge.errors.${error}`)}</p></div>;
  const profile = data.profile;
  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <PageHeader title={t("knowledge.intelligence.title")} description={`${data.project.name} · ${data.project.websiteUrl}`} action={<Button type="button" className="min-h-11 w-full sm:w-auto" onClick={() => void analyze()} disabled={analyzing}>{analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}{analyzing ? t("knowledge.intelligence.analyzing") : t("knowledge.intelligence.analyze")}</Button>} />
      <Button asChild variant="ghost" className="min-h-11 px-0"><Link href={`/projects/${projectId}/knowledge`}><ArrowLeft className="h-4 w-4" />{t("knowledge.intelligence.back")}</Link></Button>
      {error ? <p className="border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{t(`knowledge.errors.${error}`) === `knowledge.errors.${error}` ? t("knowledge.errors.REQUEST_FAILED") : t(`knowledge.errors.${error}`)}</p> : null}
      <div className="grid gap-5 border-y border-white/10 py-5 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label={t("knowledge.intelligence.completeness")} value={data.assessment.completeness === null ? t("knowledge.intelligence.unavailable") : `${data.assessment.completeness}/100`} icon={<BrainCircuit className="h-4 w-4" />} />
        <Metric label={t("knowledge.intelligence.confidence")} value={data.assessment.confidence === null ? t("knowledge.intelligence.unavailable") : `${data.assessment.confidence}%`} icon={<ShieldCheck className="h-4 w-4" />} />
        <Metric label={t("knowledge.intelligence.evidenceCount")} value={String(data.assessment.evidenceCount)} icon={<CheckCircle2 className="h-4 w-4" />} />
        <Metric label={t("knowledge.intelligence.gapCount")} value={String(data.assessment.missing.length)} icon={<AlertTriangle className="h-4 w-4" />} />
      </div>
      {data.assessment.completeness !== null ? <Progress value={data.assessment.completeness} /> : null}
      {!profile ? <Card className="border-white/10 bg-white/[0.03]"><CardContent className="p-8 text-center"><BrainCircuit className="mx-auto h-8 w-8 text-primary" /><p className="mt-3 font-medium">{t("knowledge.intelligence.notAnalyzed")}</p><p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">{t("knowledge.intelligence.notAnalyzedDescription")}</p><Button type="button" className="mt-5 min-h-11" onClick={() => void analyze()} disabled={analyzing}>{analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <BrainCircuit className="h-4 w-4" />}{t("knowledge.intelligence.analyze")}</Button></CardContent></Card> : <>
        <section className="grid gap-6 xl:grid-cols-2">
          <ProfileSection title={t("knowledge.intelligence.positioning")} icon={<Target className="h-5 w-5" />}><Definition label={t("knowledge.intelligence.summary")} value={profile.companySummary} unavailable={t("knowledge.intelligence.unavailable")} /><Definition label={t("knowledge.intelligence.industry")} value={profile.industry} unavailable={t("knowledge.intelligence.unavailable")} /><Definition label={t("knowledge.intelligence.businessType")} value={profile.businessType ? t(`knowledge.intelligence.businessTypes.${profile.businessType}`) : null} unavailable={t("knowledge.intelligence.unavailable")} /></ProfileSection>
          <ProfileSection title={t("knowledge.intelligence.proofAssets")} icon={<Award className="h-5 w-5" />}><AssetList items={profile.customerProof} empty={t("knowledge.intelligence.noCustomerProof")} /><AssetList items={profile.certifications.map((certificate) => ({ ...certificate, description: certificate.excerpt }))} empty={t("knowledge.intelligence.noCertifications")} /></ProfileSection>
        </section>
        <section className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          <ProfileSection title={t("knowledge.intelligence.mainProducts")} icon={<Package className="h-5 w-5" />}><AssetList items={profile.mainProducts} empty={t("knowledge.intelligence.noProducts")} /></ProfileSection>
          <ProfileSection title={t("knowledge.intelligence.mainServices")} icon={<BriefcaseBusiness className="h-5 w-5" />}><AssetList items={profile.mainServices} empty={t("knowledge.intelligence.noServices")} /></ProfileSection>
          <ProfileSection title={t("knowledge.intelligence.targetCustomers")} icon={<Users className="h-5 w-5" />}><AssetList items={profile.targetCustomers} empty={t("knowledge.intelligence.noTargetCustomers")} /></ProfileSection>
          <ProfileSection title={t("knowledge.intelligence.advantages")} icon={<ShieldCheck className="h-5 w-5" />}><AssetList items={profile.competitiveAdvantages} empty={t("knowledge.intelligence.noAdvantages")} /></ProfileSection>
          <ProfileSection title={t("knowledge.intelligence.faqTopics")} icon={<FileQuestion className="h-5 w-5" />}><AssetList items={profile.faqTopics.map((faq) => ({ ...faq, name: faq.question, description: faq.answer }))} empty={t("knowledge.intelligence.noFaq")} /></ProfileSection>
        </section>
      </>}
      <GapSection gaps={data.assessment.missing} />
    </div>
  );
}

function ProfileSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <Card className="min-w-0 border-white/10 bg-white/[0.03]"><CardHeader><CardTitle className="flex items-center gap-2 text-base">{icon}{title}</CardTitle></CardHeader><CardContent className="min-w-0 space-y-3">{children}</CardContent></Card>;
}

function Definition({ label, value, unavailable }: { label: string; value: string | null; unavailable: string }) {
  return <div className="border-b border-white/10 pb-3 last:border-0"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 break-words text-sm">{value || unavailable}</p></div>;
}

function AssetList({ items, empty }: { items: KnowledgeProfileItem[]; empty: string }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return <div className="space-y-3">{items.map((item, index) => <div key={`${item.sourceType}:${item.sourceId}:${item.name}:${index}`} className="min-w-0 border-l-2 border-primary/30 pl-3"><p className="break-words text-sm font-medium">{item.name}</p>{item.description ? <p className="mt-1 break-words text-xs text-muted-foreground">{item.description}</p> : null}{item.details?.length ? <p className="mt-1 break-words text-xs text-muted-foreground">{item.details.join(" · ")}</p> : null}</div>)}</div>;
}

function GapSection({ gaps }: { gaps: KnowledgeGap[] }) {
  const { t } = useI18n();
  return <section className="min-w-0 border-t border-white/10 pt-6"><div className="mb-4"><h2 className="flex items-center gap-2 text-base font-semibold"><AlertTriangle className="h-5 w-5 text-amber-300" />{t("knowledge.intelligence.knowledgeGaps")}</h2><p className="mt-1 text-sm text-muted-foreground">{t("knowledge.intelligence.whyNotUnderstood")}</p></div>{gaps.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{gaps.map((gap) => <Card key={gap.type} className="min-w-0 border-white/10 bg-white/[0.03]"><CardContent className="p-4"><div className="flex items-start justify-between gap-3"><p className="break-words text-sm font-medium">{t(`knowledge.intelligence.gapLabels.${gap.type}`)}</p><Badge variant={gap.severity === "HIGH" ? "warning" : "outline"}>{t(`knowledge.intelligence.severity.${gap.severity}`)}</Badge></div><p className="mt-2 break-words text-xs text-muted-foreground">{t(gap.reason)}</p><p className="mt-3 text-xs text-muted-foreground">{t("knowledge.intelligence.sourceCount")}: {gap.sourceCount}</p></CardContent></Card>)}</div> : <p className="border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-300">{t("knowledge.intelligence.noGaps")}</p>}</section>;
}

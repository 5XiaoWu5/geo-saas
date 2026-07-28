"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  ExternalLink,
  FileJson2,
  Globe2,
  Loader2,
  MapPin,
  Radar,
  Save,
  Send,
  ShieldCheck,
} from "lucide-react";
import { GuidedEmptyState, GuidedPageHeader, TechnicalDetails } from "@/components/shared/guided-experience";
import { OperationFeedback, type OperationStatus } from "@/components/shared/operation-feedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n/provider";
import { cn } from "@/lib/utils";
import type {
  AIPresencePlatform,
  AIPresenceStatus,
  AIPresenceSummary,
  CompanyPresenceProfile,
  DiscoverabilityEvidence,
} from "./types";

const LADDER: AIPresenceStatus[] = ["READY", "SUBMITTED", "CRAWLED", "INDEXED", "MENTIONED", "CITED"];
const PROFILE_FIELDS = [
  "legalName",
  "brandName",
  "description",
  "industry",
  "region",
  "officialWebsite",
  "phone",
  "email",
  "address",
  "businessHours",
  "foundedAt",
  "representative",
  "businessType",
  "logoUrl",
] as const;
const PROFILE_LIST_FIELDS = ["products", "services", "serviceAreas", "socialProfiles", "trustedSources"] as const;

async function readJson<T>(response: Response) {
  const body = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? "REQUEST_FAILED");
  return body;
}

function toLines(value: string[]) {
  return value.join("\n");
}

function fromLines(value: string) {
  return [...new Set(value.split(/\r?\n/).map(item => item.trim()).filter(Boolean))];
}

function profilePayload(form: CompanyPresenceProfile) {
  return {
    officialWebsite: form.officialWebsite,
    legalName: form.legalName,
    brandName: form.brandName,
    description: form.description,
    industry: form.industry,
    region: form.region,
    products: form.products,
    services: form.services,
    phone: form.phone,
    email: form.email,
    address: form.address,
    serviceAreas: form.serviceAreas,
    businessHours: form.businessHours,
    foundedAt: form.foundedAt,
    representative: form.representative,
    businessType: form.businessType,
    logoUrl: form.logoUrl,
    socialProfiles: form.socialProfiles,
    trustedSources: form.trustedSources,
    factory: form.factory,
  };
}

function evidenceFrom(summary: AIPresenceSummary) {
  const value = summary.latestCheck?.evidence as Partial<DiscoverabilityEvidence> | undefined;
  return value?.version === "ai-presence-check-v1" ? value as DiscoverabilityEvidence : null;
}

function severityTone(severity: "HIGH" | "MEDIUM" | "LOW") {
  if (severity === "HIGH") return "border-rose-300/25 bg-rose-300/[0.06]";
  if (severity === "MEDIUM") return "border-amber-300/20 bg-amber-300/[0.05]";
  return "border-sky-300/20 bg-sky-300/[0.05]";
}

export function AIPresenceCenter({ projectId }: { projectId: string }) {
  const { locale, dictionary } = useI18n();
  const c = dictionary.aiPresence;
  const [summary, setSummary] = useState<AIPresenceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [operation, setOperation] = useState<{ status: OperationStatus; message: string } | null>(null);
  const [form, setForm] = useState<CompanyPresenceProfile | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const evidenceRef = useRef<HTMLDivElement>(null);
  const platformRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await readJson<AIPresenceSummary>(await fetch(`/api/projects/${projectId}/ai-presence`, { cache: "no-store" }));
      setSummary(data);
      setForm(data.profile);
    } catch (error) {
      setOperation({ status: "FAILED", message: error instanceof Error ? error.message : "REQUEST_FAILED" });
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runCheck() {
    setOperation({ status: "ANALYZING", message: c.checking });
    try {
      await readJson(await fetch(`/api/projects/${projectId}/ai-presence/checks`, { method: "POST" }));
      setOperation({ status: "COMPLETED", message: c.checkCompleted });
      await load();
    } catch (error) {
      setOperation({ status: "FAILED", message: `${c.checkFailed} ${error instanceof Error ? error.message : ""}` });
    }
  }

  async function saveProfile() {
    if (!form) return;
    setOperation({ status: "VALIDATING", message: c.profileDescription });
    try {
      await readJson(await fetch(`/api/projects/${projectId}/ai-presence/profile`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(profilePayload(form)),
      }));
      setOperation({ status: "COMPLETED", message: locale === "zh" ? "企业资料已保存并重新计算真实缺口。" : "Company facts were saved and real gaps were recalculated." });
      setEditing(false);
      await load();
    } catch (error) {
      setOperation({ status: "FAILED", message: error instanceof Error ? error.message : "PROFILE_SAVE_FAILED" });
    }
  }

  async function declareSubmitted(platform: AIPresencePlatform) {
    if (!summary) return;
    const item = summary.platforms.find(entry => entry.platform === platform);
    if (!item) return;
    setOperation({ status: "CREATING", message: c.platformNotice });
    try {
      await readJson(await fetch(`/api/projects/${projectId}/ai-presence/tasks`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          platform: item.platform,
          taskType: item.taskType,
          targetUrl: summary.profile.officialWebsite || null,
        }),
      }));
      setOperation({ status: "COMPLETED", message: c.submissionRecorded });
      await load();
    } catch (error) {
      setOperation({ status: "FAILED", message: error instanceof Error ? error.message : "PLATFORM_SUBMISSION_SAVE_FAILED" });
    }
  }

  function moveToNext() {
    if (!summary) return;
    if (summary.nextStep.href) return;
    if (summary.nextStep.action === "EDIT_PROFILE") {
      setEditing(true);
      requestAnimationFrame(() => profileRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } else if (summary.nextStep.action === "RUN_CHECK") {
      void runCheck();
    } else if (summary.nextStep.action === "SUBMIT_PLATFORM") {
      platformRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      evidenceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  if (loading && !summary) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-cyan-300" />
      </div>
    );
  }

  if (!summary || !form) {
    return (
      <GuidedEmptyState
        title={c.title}
        reason={operation?.message ?? c.noEvidence}
        instruction={locale === "zh" ? "返回项目概览并确认项目仍然可访问。" : "Return to the project overview and confirm the project is accessible."}
        action={<Button asChild><Link href={`/projects/${projectId}/overview`}>{locale === "zh" ? "返回项目" : "Return to project"}</Link></Button>}
      />
    );
  }

  const evidence = evidenceFrom(summary);
  const primaryAction = summary.nextStep.href
    ? (
      <Button asChild className="w-full sm:w-auto">
        <Link href={summary.nextStep.href}>{summary.nextStep.label}<ArrowRight className="h-4 w-4" /></Link>
      </Button>
    )
    : (
      <Button onClick={moveToNext} className="w-full sm:w-auto">
        {summary.nextStep.action === "RUN_CHECK" ? <Radar className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
        {summary.nextStep.label}
      </Button>
    );

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <GuidedPageHeader
        title={c.title}
        description={c.description}
        status={c.statusLabels[summary.readiness]}
        action={primaryAction}
      />

      {operation ? <OperationFeedback status={operation.status} message={operation.message} /> : null}

      <section aria-label={c.evidenceLadder} className="overflow-hidden rounded-3xl border border-white/10 bg-card/60 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">{c.evidenceLadder}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{c.statusHint}</p>
          </div>
          <ShieldCheck className="h-5 w-5 shrink-0 text-cyan-300" />
        </div>
        <ol className="mt-4 flex snap-x gap-2 overflow-x-auto pb-2">
          {LADDER.map((stage, index) => {
            const reached = summary.stages[stage as keyof typeof summary.stages];
            return (
              <li key={stage} className={cn("flex min-h-16 min-w-[148px] snap-start items-center gap-3 rounded-2xl border px-3", reached ? "border-cyan-300/30 bg-cyan-300/[0.08]" : "border-white/10 bg-black/10 text-muted-foreground")}>
                <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs", reached ? "border-cyan-300/40 text-cyan-200" : "border-white/15")}>
                  {reached ? <Check className="h-4 w-4" /> : index + 1}
                </span>
                <span className="text-sm font-medium">{c.statusLabels[stage]}</span>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,.85fr)]">
        <Card className="border-white/10 bg-card/65">
          <CardHeader>
            <CardTitle>{c.primaryIssues}</CardTitle>
            <CardDescription>{locale === "zh" ? "只显示当前证据支持的最高优先级问题。" : "Only the highest-priority issues supported by current evidence are shown."}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.issues.length ? summary.issues.map(issue => (
              <article key={issue.key} className={cn("rounded-2xl border p-4", severityTone(issue.severity))}>
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="min-w-0">
                    <h3 className="font-medium">{issue.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{issue.reason}</p>
                    <p className="mt-2 text-sm"><strong>{locale === "zh" ? "下一步：" : "Next: "}</strong>{issue.action}</p>
                  </div>
                </div>
              </article>
            )) : (
              <div className="flex items-center gap-3 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.06] p-4">
                <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                <p className="text-sm">{locale === "zh" ? "当前证据未发现需要优先处理的基础准备问题。" : "Current evidence shows no high-priority readiness issue."}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-card/65">
          <CardHeader>
            <CardTitle>{c.completedWork}</CardTitle>
            <CardDescription>{locale === "zh" ? "仅展示已验证证据或明确的用户提交声明。" : "Only verified evidence or explicit user submission declarations are shown."}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.completed.length ? summary.completed.map((item, index) => (
              <div key={`${item.completedAt}-${index}`} className="flex items-start gap-3 rounded-2xl border border-white/10 p-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.source} · {new Date(item.completedAt).toLocaleString(locale === "zh" ? "zh-CN" : "en-US")}</p>
                </div>
              </div>
            )) : <p className="text-sm text-muted-foreground">{c.noCompleted}</p>}
          </CardContent>
        </Card>
      </section>

      <section className="rounded-3xl border border-cyan-300/20 bg-[linear-gradient(135deg,rgba(34,211,238,.08),rgba(79,70,229,.06))] p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-cyan-200">{c.nextStep}</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div>
            <h2 className="text-xl font-semibold">{summary.nextStep.label}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{summary.issues[0]?.action ?? c.statusHint}</p>
          </div>
          {primaryAction}
        </div>
      </section>

      <div ref={profileRef} className="scroll-mt-6">
        <Card className="border-white/10 bg-card/65">
          <CardHeader className="sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
            <div>
              <CardTitle>{c.profile}</CardTitle>
              <CardDescription className="mt-2 max-w-3xl">{c.profileDescription}</CardDescription>
            </div>
            <Button variant="outline" onClick={() => setEditing(value => !value)}>
              {editing ? c.closeEditor : c.editProfile}
            </Button>
          </CardHeader>
          <CardContent>
            {editing ? (
              <div className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  {PROFILE_FIELDS.map(key => (
                    <label key={key} className={cn("grid gap-2 text-sm", key === "description" || key === "address" ? "md:col-span-2" : "")}>
                      <span>{c.fields[key]}</span>
                      {key === "description" || key === "address"
                        ? <Textarea value={form[key]} onChange={event => setForm({ ...form, [key]: event.target.value })} />
                        : <Input className="min-h-11" value={form[key]} onChange={event => setForm({ ...form, [key]: event.target.value })} />}
                    </label>
                  ))}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {PROFILE_LIST_FIELDS.map(key => (
                    <label key={key} className="grid gap-2 text-sm">
                      <span>{c.fields[key]}</span>
                      <Textarea
                        value={toLines(form[key])}
                        placeholder={key === "products" ? c.productsHint : key === "services" ? c.servicesHint : c.listHint}
                        onChange={event => setForm({ ...form, [key]: fromLines(event.target.value) })}
                      />
                    </label>
                  ))}
                </div>
                <TechnicalDetails label={locale === "zh" ? "工厂企业扩展资料" : "Factory business details"}>
                  <div className="grid gap-4 md:grid-cols-2">
                    {Object.entries(form.factory).map(([key, value]) => (
                      <label key={key} className="grid gap-2 text-sm">
                        <span>{key}</span>
                        <Input className="min-h-11" value={value} onChange={event => setForm({ ...form, factory: { ...form.factory, [key]: event.target.value } })} />
                      </label>
                    ))}
                  </div>
                </TechnicalDetails>
                <Button onClick={() => void saveProfile()}><Save className="h-4 w-4" />{c.saveProfile}</Button>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {summary.profileFields.map(field => (
                  <div key={field.key} className="min-w-0 rounded-2xl border border-white/10 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{c.fields[field.key as keyof typeof c.fields] ?? field.key}</p>
                      <span className={cn("rounded-full px-2 py-1 text-[11px]", field.complete ? "bg-emerald-300/10 text-emerald-200" : "bg-amber-300/10 text-amber-200")}>{field.complete ? c.found : c.waitingInformation}</span>
                    </div>
                    <p className="mt-2 break-words text-sm text-muted-foreground">{Array.isArray(field.value) ? field.value.join("、") || c.unavailable : field.value || c.unavailable}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{field.source}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div ref={evidenceRef} className="scroll-mt-6 space-y-4">
        <Card className="border-white/10 bg-card/65">
          <CardHeader className="sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
            <div>
              <CardTitle>{c.websiteCheck}</CardTitle>
              <CardDescription className="mt-2">{summary.profile.officialWebsite}</CardDescription>
            </div>
            <Button onClick={() => void runCheck()} disabled={operation?.status === "ANALYZING"}><Radar className="h-4 w-4" />{c.runCheck}</Button>
          </CardHeader>
          <CardContent>
            {evidence ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <EvidenceTile icon={<Globe2 className="h-4 w-4" />} title={locale === "zh" ? "首页访问" : "Homepage"} value={evidence.homepage.accessible ? c.available : c.unavailable} detail={evidence.homepage.statusCode ? `HTTP ${evidence.homepage.statusCode}` : c.unavailable} />
                <EvidenceTile icon={<ShieldCheck className="h-4 w-4" />} title="HTTPS" value={evidence.homepage.https ? c.found : c.notFound} detail={evidence.homepage.finalUrl ?? c.unavailable} />
                <EvidenceTile icon={<MapPin className="h-4 w-4" />} title={c.sitemap} value={evidence.sitemap.readable ? c.found : c.notFound} detail={evidence.sitemap.urlCount === null ? c.unavailable : `${evidence.sitemap.urlCount} URLs`} />
                <EvidenceTile icon={<FileJson2 className="h-4 w-4" />} title="Schema" value={evidence.schema.count ? c.found : c.notFound} detail={evidence.schema.types.join(", ") || c.unavailable} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{c.noEvidence}</p>
            )}
            {evidence ? (
              <TechnicalDetails className="mt-4" label={c.technicalEvidence}>
                <pre className="max-w-full whitespace-pre-wrap break-all text-xs leading-5 text-muted-foreground">{JSON.stringify(evidence, null, 2)}</pre>
              </TechnicalDetails>
            ) : null}
          </CardContent>
        </Card>

        {evidence ? (
          <section className="grid gap-4 xl:grid-cols-2">
            <Card className="border-white/10 bg-card/65">
              <CardHeader><CardTitle>{c.crawlerAccess}</CardTitle><CardDescription>{locale === "zh" ? "允许访问只代表具备抓取条件。" : "Allowed access only means the site is crawl-ready."}</CardDescription></CardHeader>
              <CardContent className="space-y-2">
                {evidence.robots.crawlers.map(crawler => (
                  <div key={crawler.crawler} className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-white/10 px-4">
                    <span className="text-sm font-medium">{crawler.crawler}</span>
                    <span className={cn("text-sm", crawler.status === "BLOCKED" ? "text-rose-200" : crawler.status === "UNAVAILABLE" ? "text-muted-foreground" : "text-emerald-200")}>
                      {crawler.status === "BLOCKED" ? c.blocked : crawler.status === "UNAVAILABLE" ? c.unavailable : c.allowed}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="border-white/10 bg-card/65">
              <CardHeader><CardTitle>{c.corePages}</CardTitle><CardDescription>{locale === "zh" ? "基于首页链接和 Sitemap 的本次发现结果。" : "Pages found in homepage links and the Sitemap during this check."}</CardDescription></CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2">
                {evidence.corePages.map(page => (
                  <div key={page.kind} className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-white/10 px-3">
                    <span className="text-sm">{c.corePageLabels[page.kind]}</span>
                    <span className={page.found ? "text-emerald-200" : "text-muted-foreground"}>{page.found ? c.found : c.notFound}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        ) : null}
      </div>

      <Card className="border-white/10 bg-card/65">
        <CardHeader><CardTitle>{c.schema}</CardTitle><CardDescription>{locale === "zh" ? "只使用已确认企业事实；缺少资料时不生成完整 JSON-LD。" : "Only confirmed company facts are used. Complete JSON-LD is not generated when facts are missing."}</CardDescription></CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-2">
          {summary.schemaRecommendations.map(item => (
            <article key={item.type} className="min-w-0 rounded-2xl border border-white/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-medium">{item.type}</h3>
                <span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-xs text-muted-foreground">
                  {item.status === "READY" ? c.readyToGenerate : item.status === "EXISTS" ? c.alreadyExists : item.status === "NOT_APPLICABLE" ? c.notApplicable : c.waitingInformation}
                </span>
              </div>
              <p className="mt-2 break-words text-sm text-muted-foreground">{item.targetPage}</p>
              {item.missingFields.length ? <p className="mt-2 text-sm text-amber-200">{c.waitingInformation}：{item.missingFields.join(", ")}</p> : null}
              {item.jsonLd ? <TechnicalDetails className="mt-3" label="JSON-LD"><pre className="whitespace-pre-wrap break-all text-xs">{JSON.stringify(item.jsonLd, null, 2)}</pre></TechnicalDetails> : null}
            </article>
          ))}
        </CardContent>
      </Card>

      <div ref={platformRef} className="scroll-mt-6">
        <Card className="border-white/10 bg-card/65">
          <CardHeader><CardTitle>{c.platforms}</CardTitle><CardDescription>{c.platformNotice}</CardDescription></CardHeader>
          <CardContent className="grid gap-3 lg:grid-cols-2">
            {summary.platforms.map(platform => {
              const latest = summary.platformTasks.find(task => task.platform === platform.platform);
              return (
                <article key={platform.platform} className="rounded-2xl border border-white/10 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium">{platform.name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{latest ? c.statusLabels[latest.status] : c.statusLabels.NOT_STARTED}</p>
                    </div>
                    <Send className="h-4 w-4 text-cyan-300" />
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <Button asChild variant="outline">
                      <a href={platform.officialUrl} target="_blank" rel="noreferrer">{c.openOfficial}<ExternalLink className="h-4 w-4" /></a>
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={!["READY", "SUBMITTED", "CRAWLED", "INDEXED", "MENTIONED", "CITED"].includes(summary.readiness)}
                      onClick={() => void declareSubmitted(platform.platform)}
                    >
                      {c.confirmSubmitted}
                    </Button>
                  </div>
                  {latest ? <Button asChild variant="link" className="mt-2 px-0"><Link href={`/projects/${projectId}/geo/ai-presence/tasks/${latest.id}`}>{c.viewTask}<ArrowRight className="h-4 w-4" /></Link></Button> : null}
                </article>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card className="border-white/10 bg-card/65">
          <CardHeader><CardTitle>{c.aiVerification}</CardTitle><CardDescription>{locale === "zh" ? "只读取真实 AI Search Result 和 Citation。" : "Reads only real AI Search Results and Citations."}</CardDescription></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <EvidenceTile icon={<Bot className="h-4 w-4" />} title={locale === "zh" ? "品牌提及" : "Brand mention"} value={summary.aiEvidence.mentioned ? c.found : c.unavailable} detail={`${summary.aiEvidence.resultCount}`} />
            <EvidenceTile icon={<Globe2 className="h-4 w-4" />} title="Citation" value={summary.aiEvidence.cited ? c.found : c.unavailable} detail={`${summary.aiEvidence.citationCount}`} />
            <Button asChild variant="outline" className="sm:col-span-2"><Link href={`/projects/${projectId}/geo/monitoring`}>{locale === "zh" ? "进入真实 AI 搜索检测" : "Open real AI search checks"}<ArrowRight className="h-4 w-4" /></Link></Button>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-card/65">
          <CardHeader><CardTitle>{c.history}</CardTitle><CardDescription>{locale === "zh" ? "重复检查会新增记录，旧证据不会被覆盖。" : "Repeated checks create new records; old evidence is never overwritten."}</CardDescription></CardHeader>
          <CardContent className="space-y-2">
            {summary.tasks.length ? summary.tasks.slice(0, 8).map(task => (
              <Link key={task.id} href={`/projects/${projectId}/geo/ai-presence/tasks/${task.id}`} className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-white/10 px-4 transition hover:border-cyan-300/25">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{task.evidenceSummary || task.taskType}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(task.createdAt).toLocaleString(locale === "zh" ? "zh-CN" : "en-US")}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0" />
              </Link>
            )) : <p className="text-sm text-muted-foreground">{c.noEvidence}</p>}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function EvidenceTile({ icon, title, value, detail }: { icon: React.ReactNode; title: string; value: string; detail: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">{icon}{title}</div>
      <p className="mt-3 font-semibold">{value}</p>
      <p className="mt-1 break-all text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

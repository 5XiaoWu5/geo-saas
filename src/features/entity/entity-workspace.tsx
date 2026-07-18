"use client";

import Link from "next/link";
import type { FormEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowRight, BookOpen, Building2, CheckCircle2, ClipboardList, FileText, Globe2, Loader2, Save, ShieldCheck, Sparkles, Target } from "lucide-react";
import { PageHeader } from "@/components/shared/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import type { EntityProjectReport, EntityResponse } from "@/features/entity/types";
import { formatDateTime, getHostname } from "@/lib/format";
import { useI18n } from "@/i18n/provider";

type AttributeDraft = {
  key: string;
  value: string;
  source: string;
};

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  const data = text ? (JSON.parse(text) as T & { error?: string }) : ({} as T & { error?: string });
  if (!response.ok) throw new Error(data.error ?? "请求失败");
  return data;
}

function listFromText(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function textFromList(items: string[]) {
  return items.join("\n");
}

function getAttribute(report: EntityProjectReport | null, key: string) {
  return report?.attributes.find((attribute) => attribute.key === key)?.value ?? "";
}

export function EntityWorkspace({ initialProjectId }: { initialProjectId?: string }) {
  const { t } = useI18n();
  const [data, setData] = useState<EntityResponse | null>(null);
  const [projectId, setProjectId] = useState(initialProjectId ?? "");
  const [brandName, setBrandName] = useState("");
  const [industry, setIndustry] = useState("");
  const [region, setRegion] = useState("");
  const [description, setDescription] = useState("");
  const [servicesText, setServicesText] = useState("");
  const [productsText, setProductsText] = useState("");
  const [advantagesText, setAdvantagesText] = useState("");
  const [casesText, setCasesText] = useState("");
  const [contactText, setContactText] = useState("");
  const [faqText, setFaqText] = useState("");
  const [servicePageText, setServicePageText] = useState("");
  const [trustText, setTrustText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const hydrateForm = useCallback((report: EntityProjectReport | null) => {
    const project = report?.project;
    const profile = report?.profile;
    setBrandName(profile?.brandName || project?.name || "");
    setIndustry(profile?.industry || project?.industry || "");
    setRegion(profile?.region || project?.country || "");
    setDescription(profile?.description || project?.description || report?.scan?.description || "");
    setServicesText(textFromList(profile?.services ?? []));
    setProductsText(textFromList(profile?.products ?? []));
    setAdvantagesText(textFromList(profile?.advantages ?? []));
    setCasesText(getAttribute(report, "case"));
    setContactText(getAttribute(report, "contact"));
    setFaqText(getAttribute(report, "faq"));
    setServicePageText(getAttribute(report, "servicePage"));
    setTrustText(getAttribute(report, "thirdParty"));
  }, []);

  const loadEntity = useCallback(async (id?: string) => {
    setError("");
    const suffix = id ? `?projectId=${encodeURIComponent(id)}` : "";
    const result = await readJson<EntityResponse>(await fetch(`/api/entity${suffix}`, { cache: "no-store" }));
    setData(result);
    setProjectId(result.selectedProjectId ?? "");
    hydrateForm(result.report);
  }, [hydrateForm]);

  useEffect(() => {
    let mounted = true;
    loadEntity(initialProjectId)
      .catch((requestError) => {
        if (mounted) setError(requestError instanceof Error ? requestError.message : "实体中心加载失败");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [initialProjectId, loadEntity]);

  const report = data?.report ?? null;
  const projects = useMemo(() => data?.projects ?? [], [data?.projects]);
  const activeProject = useMemo(
    () => projects.find((project) => project.id === projectId) ?? projects[0] ?? null,
    [projectId, projects],
  );

  function buildAttributes(): AttributeDraft[] {
    return [
      { key: "case", value: casesText, source: "user" },
      { key: "contact", value: contactText, source: "user" },
      { key: "faq", value: faqText, source: "user" },
      { key: "servicePage", value: servicePageText, source: "user" },
      { key: "thirdParty", value: trustText, source: "user" },
    ].filter((attribute) => attribute.value.trim());
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectId) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const result = await readJson<{ report: EntityProjectReport }>(
        await fetch("/api/entity/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            brandName,
            industry,
            region,
            description,
            services: listFromText(servicesText),
            products: listFromText(productsText),
            advantages: listFromText(advantagesText),
            attributes: buildAttributes(),
          }),
        }),
      );
      setData((current) => current ? { ...current, report: result.report } : current);
      setSuccess("实体档案已保存，评分已基于真实数据刷新。");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "保存实体档案失败");
    } finally {
      setSaving(false);
    }
  }

  async function analyzeEntity() {
    if (!projectId) return;
    setAnalyzing(true);
    setError("");
    setSuccess("");
    try {
      const result = await readJson<{ createdOrExistingTaskCount: number }>(
        await fetch("/api/entity/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, createTasks: true }),
        }),
      );
      await loadEntity(projectId);
      setSuccess(`实体分析完成，已同步 ${result.createdOrExistingTaskCount} 条优化任务。`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "实体分析失败");
    } finally {
      setAnalyzing(false);
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Entity Center" description="正在读取真实项目、扫描结果和企业实体档案。" />
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> 正在加载...
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div>
        <PageHeader title="Entity Center" description="建立企业级 AI 可理解身份系统，帮助 AI 理解企业是谁、提供什么服务、为什么值得推荐。" />
        <div className="flex gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Entity Center"
        description="企业实体中心会整合真实 Project、WebsiteScan、GeoAnalysis 和用户补充信息，形成可被 AI 理解的企业身份。"
        action={
          <div className="flex flex-wrap gap-2">
            {projectId ? <Button asChild variant="outline"><Link href={`/projects/${projectId}/knowledge/intelligence`}><BookOpen className="h-4 w-4" />{t("knowledge.intelligence.open")}</Link></Button> : null}
            <Button asChild variant="outline">
              <Link href="/optimization">
                <ClipboardList className="h-4 w-4" /> 优化中心
              </Link>
            </Button>
            <Button onClick={() => void analyzeEntity()} disabled={!projectId || analyzing}>
              {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} 生成优化建议
            </Button>
          </div>
        }
      />

      {error ? (
        <div className="flex gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      ) : null}
      {success ? (
        <div className="flex gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> {success}
        </div>
      ) : null}

      {projects.length === 0 ? (
        <Card className="glass-panel border-white/10">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">当前账号还没有真实项目。创建项目后即可建立企业实体档案。</p>
            <Button asChild className="mt-4">
              <Link href="/projects">前往项目</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => void loadEntity(project.id)}
                className={`rounded-xl border px-4 py-2 text-sm transition ${project.id === projectId ? "border-primary/40 bg-primary/15 text-primary" : "border-white/10 bg-white/[0.03] text-muted-foreground hover:text-foreground"}`}
              >
                {project.name}
              </button>
            ))}
          </div>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={<Target className="h-5 w-5" />} label="实体完整度" value={`${report?.score.totalScore ?? 0}`} suffix="/100" description="规则评分，来自真实档案与扫描信号" />
            <MetricCard icon={<Building2 className="h-5 w-5" />} label="缺失项" value={`${report?.score.missingItems.length ?? 0}`} description="会转化为 OptimizationTask" />
            <MetricCard icon={<FileText className="h-5 w-5" />} label="GEO 分数" value={`${activeProject?.geoScore ?? 0}`} description="来自项目最新真实评分" />
            <MetricCard icon={<ShieldCheck className="h-5 w-5" />} label="结构化数据" value={`${report?.scan?.schemaCount ?? 0}`} description="来自 WebsiteScan Schema 检测" />
          </section>

          <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <EntityProfileCard report={report} />
            <ScoreCard report={report} />
          </section>

          <form onSubmit={(event) => void saveProfile(event)} className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <Card className="glass-panel border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="h-5 w-5 text-primary" /> 企业实体档案
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="品牌名称" id="entity-brand" value={brandName} onChange={setBrandName} />
                  <Field label="行业" id="entity-industry" value={industry} onChange={setIndustry} />
                  <Field label="地区" id="entity-region" value={region} onChange={setRegion} />
                  <Field label="官网" id="entity-domain" value={report?.project.websiteUrl ?? ""} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="entity-description">主营业务与品牌描述</Label>
                  <Textarea id="entity-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="说明企业是谁、服务对象、核心能力和推荐理由。" />
                </div>
                <ListField label="服务范围" id="entity-services" value={servicesText} onChange={setServicesText} placeholder="每行一个服务，例如：工业废气治理" />
                <ListField label="产品列表" id="entity-products" value={productsText} onChange={setProductsText} placeholder="每行一个产品或解决方案" />
                <ListField label="核心优势" id="entity-advantages" value={advantagesText} onChange={setAdvantagesText} placeholder="每行一个优势，例如：本地交付团队" />
              </CardContent>
            </Card>

            <Card className="glass-panel border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShieldCheck className="h-5 w-5 text-primary" /> 可信信号补充
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ListField label="案例" id="entity-cases" value={casesText} onChange={setCasesText} placeholder="客户案例、项目场景、结果证明" />
                <ListField label="联系方式" id="entity-contact" value={contactText} onChange={setContactText} placeholder="电话、邮箱、地址或联系页 URL" />
                <ListField label="FAQ" id="entity-faq" value={faqText} onChange={setFaqText} placeholder="常见问题与回答，每行一个" />
                <ListField label="服务页面" id="entity-service-page" value={servicePageText} onChange={setServicePageText} placeholder="服务页 URL 或页面名称" />
                <ListField label="第三方可信度" id="entity-trust" value={trustText} onChange={setTrustText} placeholder="媒体、认证、行业目录、评价平台链接" />
                <Button type="submit" disabled={!projectId || saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} 保存实体档案
                </Button>
              </CardContent>
            </Card>
          </form>

          <MissingItemsCard report={report} projectId={projectId} />
        </>
      )}
    </div>
  );
}

function MetricCard({ icon, label, value, suffix, description }: { icon: ReactNode; label: string; value: string; suffix?: string; description: string }) {
  return (
    <Card className="glass-panel border-white/10">
      <CardContent className="p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">{icon}</div>
        <p className="mt-4 text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-foreground">{value}{suffix ? <span className="ml-1 text-sm text-muted-foreground">{suffix}</span> : null}</p>
        <p className="mt-2 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function EntityProfileCard({ report }: { report: EntityProjectReport | null }) {
  if (!report) return null;
  const profile = report.profile;
  const website = getHostname(report.project.websiteUrl);
  const services = profile?.services ?? [];
  const products = profile?.products ?? [];
  const advantages = profile?.advantages ?? [];

  return (
    <Card className="glass-panel border-white/10">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Globe2 className="h-5 w-5 text-primary" /> 企业基本信息
        </CardTitle>
        <Button asChild variant="outline" size="sm">
          <Link href={`/projects/${report.project.id}`}>
            项目详情 <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xl font-semibold text-foreground">{profile?.brandName || report.project.name}</p>
          <p className="mt-1 break-all text-sm text-muted-foreground">{website}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <InfoTile label="行业" value={profile?.industry || report.project.industry} />
          <InfoTile label="地区" value={profile?.region || report.project.country} />
          <InfoTile label="分析时间" value={report.analysis?.createdAt ? formatDateTime(report.analysis.createdAt) : "暂无分析"} />
          <InfoTile label="扫描标题" value={report.scan?.title ?? "暂无扫描标题"} />
        </div>
        <p className="break-words rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-muted-foreground">
          {profile?.description || report.project.description || report.scan?.description || "暂无品牌描述，请补充企业是谁、服务对象和核心能力。"}
        </p>
        <TagGroup label="主营业务" items={services} empty="暂无服务范围" />
        <TagGroup label="产品列表" items={products} empty="暂无产品列表" />
        <TagGroup label="核心优势" items={advantages} empty="暂无核心优势" />
      </CardContent>
    </Card>
  );
}

function ScoreCard({ report }: { report: EntityProjectReport | null }) {
  if (!report) return null;
  return (
    <Card className="glass-panel border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="h-5 w-5 text-primary" /> Entity Score
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-3xl border border-primary/20 bg-primary/[0.06] p-5">
          <p className="text-sm text-muted-foreground">企业实体完整度</p>
          <p className="mt-2 text-5xl font-semibold tracking-tight text-primary">{report.score.totalScore}</p>
          <Progress value={report.score.totalScore} className="mt-4" />
        </div>
        {report.score.dimensions.map((dimension) => (
          <div key={dimension.key} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">{dimension.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{dimension.description}</p>
              </div>
              <Badge variant={dimension.score >= 14 ? "success" : "warning"}>{dimension.score}/{dimension.maxScore}</Badge>
            </div>
            <Progress value={(dimension.score / dimension.maxScore) * 100} className="mt-3" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function MissingItemsCard({ report, projectId }: { report: EntityProjectReport | null; projectId: string }) {
  const items = report?.score.missingItems ?? [];
  return (
    <Card className="glass-panel border-white/10">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertCircle className="h-5 w-5 text-primary" /> 缺失项与优化建议
        </CardTitle>
        <Button asChild variant="outline" size="sm">
          <Link href={projectId ? `/projects/${projectId}/optimization` : "/optimization"}>
            查看任务 <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-300">
            当前实体档案没有明显缺失项。后续可继续补充第三方可信度和案例细节。
          </div>
        ) : (
          items.map((item) => (
            <div key={item.key} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="break-words text-sm font-medium text-foreground">{item.title}</p>
                  <p className="mt-1 break-words text-sm text-muted-foreground">{item.description}</p>
                </div>
                <Badge variant={item.severity === "High" ? "warning" : item.severity === "Medium" ? "outline" : "muted"}>{item.severity}</Badge>
              </div>
              <div className="mt-3 rounded-xl border border-primary/15 bg-primary/[0.06] p-3 text-sm text-foreground">
                <span className="text-primary">建议：</span>
                <span className="break-words">{item.recommendation}</span>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function Field({ label, id, value, onChange, disabled }: { label: string; id: string; value: string; onChange?: (value: string) => void; disabled?: boolean }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} disabled={disabled} onChange={(event) => onChange?.(event.target.value)} />
    </div>
  );
}

function ListField({ label, id, value, onChange, placeholder }: { label: string; id: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea id={id} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      <p className="text-xs text-muted-foreground">支持每行一个条目，也支持逗号分隔。</p>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function TagGroup({ label, items, empty }: { label: string; items: string[]; empty: string }) {
  return (
    <div>
      <p className="mb-2 text-xs text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.length ? items.map((item) => <Badge key={item} variant="outline" className="break-all">{item}</Badge>) : <Badge variant="muted">{empty}</Badge>}
      </div>
    </div>
  );
}

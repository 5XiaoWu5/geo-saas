"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { BookOpen, BriefcaseBusiness, FileText, FolderOpen, Loader2, Package, Plus, Trophy } from "lucide-react";
import { PageHeader } from "@/components/shared/page";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/i18n/provider";
import type { CustomerCase, KnowledgeWorkspace as Workspace, ProductEntity, ServiceEntity } from "../types";
import { DialogField, DialogTextField, KnowledgeDialog, lines } from "./knowledge-dialog";

type FormKind = "product" | "service" | "case" | null;

async function responseJson<T>(response: Response) {
  const data = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "REQUEST_FAILED");
  return data;
}

function Metric({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return <div className="min-w-0 border-l-2 border-primary/40 pl-4"><div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div><p className="mt-2 font-mono text-2xl font-semibold">{value}</p></div>;
}

export function KnowledgeWorkspace({ projectId }: { projectId: string }) {
  const { t } = useI18n();
  const [data, setData] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [formKind, setFormKind] = useState<FormKind>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => setData(await responseJson<Workspace>(await fetch(`/api/knowledge/${projectId}`, { cache: "no-store" }))), [projectId]);
  useEffect(() => { load().catch((requestError) => setError(requestError instanceof Error ? requestError.message : "REQUEST_FAILED")).finally(() => setLoading(false)); }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formKind) return;
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const payload = formKind === "product" ? { name: String(form.get("name") ?? ""), category: String(form.get("category") ?? ""), description: String(form.get("description") ?? ""), features: lines(form.get("features")), applications: lines(form.get("applications")), targetCustomers: lines(form.get("targetCustomers")) }
      : formKind === "service" ? { name: String(form.get("name") ?? ""), description: String(form.get("description") ?? ""), industries: lines(form.get("industries")) }
        : { customerName: String(form.get("customerName") ?? ""), industry: String(form.get("industry") ?? ""), problem: String(form.get("problem") ?? ""), solution: String(form.get("solution") ?? ""), result: String(form.get("result") ?? ""), metrics: Object.fromEntries(lines(form.get("metrics")).map((item) => { const [key, ...rest] = item.split(":"); return [key.trim(), rest.join(":").trim()]; }).filter(([key]) => key)) };
    try {
      await responseJson(await fetch(`/api/knowledge/${projectId}/${formKind === "case" ? "cases" : `${formKind}s`}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }));
      await load();
      setFormKind(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "REQUEST_FAILED");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{t("knowledge.loading")}</div>;
  if (!data) return <p className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{t(`knowledge.errors.${error}`) === `knowledge.errors.${error}` ? t("knowledge.errors.REQUEST_FAILED") : t(`knowledge.errors.${error}`)}</p>;

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <PageHeader title={t("knowledge.projectTitle")} description={`${data.project.name} · ${data.project.websiteUrl}`} />
      <div className="grid gap-5 border-y border-white/10 py-5 sm:grid-cols-2 xl:grid-cols-5"><Metric label={t("knowledge.completeness")} value={`${data.knowledgeBase.completenessScore ?? 0}/100`} icon={<BookOpen className="h-4 w-4" />} /><Metric label={t("knowledge.understanding")} value={data.knowledgeBase.understandingScore === null ? "--" : `${data.knowledgeBase.understandingScore}/100`} icon={<FolderOpen className="h-4 w-4" />} /><Metric label={t("knowledge.products")} value={data.products.length} icon={<Package className="h-4 w-4" />} /><Metric label={t("knowledge.cases")} value={data.cases.length} icon={<Trophy className="h-4 w-4" />} /><Metric label={t("knowledge.documents")} value={data.documents.length} icon={<FileText className="h-4 w-4" />} /></div>
      <Tabs defaultValue="products" className="min-w-0"><TabsList className="flex h-auto w-full justify-start gap-1 overflow-x-auto bg-white/[0.03] p-1"><TabsTrigger value="products" className="min-h-11 shrink-0">{t("knowledge.products")}</TabsTrigger><TabsTrigger value="services" className="min-h-11 shrink-0">{t("knowledge.services")}</TabsTrigger><TabsTrigger value="cases" className="min-h-11 shrink-0">{t("knowledge.cases")}</TabsTrigger><TabsTrigger value="technical" className="min-h-11 shrink-0">{t("knowledge.technical")}</TabsTrigger></TabsList>
        <TabsContent value="products"><AssetSection title={t("knowledge.products")} addLabel={t("knowledge.addProduct")} icon={<Package className="h-5 w-5" />} onAdd={() => setFormKind("product")} empty={data.products.length === 0}><ProductList items={data.products} /></AssetSection></TabsContent>
        <TabsContent value="services"><AssetSection title={t("knowledge.services")} addLabel={t("knowledge.addService")} icon={<BriefcaseBusiness className="h-5 w-5" />} onAdd={() => setFormKind("service")} empty={data.services.length === 0}><ServiceList items={data.services} /></AssetSection></TabsContent>
        <TabsContent value="cases"><AssetSection title={t("knowledge.cases")} addLabel={t("knowledge.addCase")} icon={<Trophy className="h-5 w-5" />} onAdd={() => setFormKind("case")} empty={data.cases.length === 0}><CaseList items={data.cases} /></AssetSection></TabsContent>
        <TabsContent value="technical"><AssetSection title={t("knowledge.technical")} icon={<FileText className="h-5 w-5" />} empty={data.documents.length + data.technicalDocuments.length === 0}><DocumentList data={data} /></AssetSection></TabsContent>
      </Tabs>
      <KnowledgeDialog title={formKind ? t(`knowledge.forms.${formKind}`) : ""} open={Boolean(formKind)} busy={busy} error={error ? t(`knowledge.errors.${error}`) : ""} onClose={() => { setFormKind(null); setError(""); }} onSubmit={submit}>{formKind === "product" ? <ProductForm /> : formKind === "service" ? <ServiceForm /> : <CaseForm />}</KnowledgeDialog>
    </div>
  );
}

function AssetSection({ title, addLabel, icon, onAdd, empty, children }: { title: string; addLabel?: string; icon: React.ReactNode; onAdd?: () => void; empty: boolean; children: React.ReactNode }) {
  const { t } = useI18n();
  return <section className="min-w-0 py-4"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-base font-semibold">{icon}{title}</h2>{onAdd ? <Button type="button" className="min-h-11" onClick={onAdd}><Plus className="h-4 w-4" />{addLabel}</Button> : null}</div>{empty ? <Card className="border-white/10 bg-white/[0.03]"><CardContent className="p-8 text-center text-sm text-muted-foreground">{t("knowledge.emptyAssets")}</CardContent></Card> : children}</section>;
}

function ProductList({ items }: { items: ProductEntity[] }) { const { t } = useI18n(); return <ResponsiveList headers={[t("knowledge.fields.name"), t("knowledge.fields.category"), t("knowledge.fields.description"), t("knowledge.fields.applications")]} rows={items.map((item) => ({ id: item.id, cells: [item.name, item.category || "--", item.description || "--", item.applications.join("、") || "--"] }))} />; }
function ServiceList({ items }: { items: ServiceEntity[] }) { const { t } = useI18n(); return <ResponsiveList headers={[t("knowledge.fields.name"), t("knowledge.fields.description"), t("knowledge.fields.industries")]} rows={items.map((item) => ({ id: item.id, cells: [item.name, item.description || "--", item.industries.join("、") || "--"] }))} />; }
function CaseList({ items }: { items: CustomerCase[] }) { const { t } = useI18n(); return <ResponsiveList headers={[t("knowledge.fields.customer"), t("knowledge.fields.industry"), t("knowledge.fields.problem"), t("knowledge.fields.result")]} rows={items.map((item) => ({ id: item.id, cells: [item.customerName, item.industry || "--", item.problem || "--", item.result || "--"] }))} />; }
function DocumentList({ data }: { data: Workspace }) { const { t } = useI18n(); return <ResponsiveList headers={[t("knowledge.fields.technicalName"), t("knowledge.fields.type"), t("knowledge.fields.status")]} rows={[...data.documents.map((item) => ({ id: item.id, cells: [item.name, item.mimeType, item.processingStatus] })), ...data.technicalDocuments.map((item) => ({ id: item.id, cells: [item.title, item.type, item.status] }))]} />; }

function ResponsiveList({ headers, rows }: { headers: string[]; rows: Array<{ id: string; cells: string[] }> }) {
  return <><div className="grid gap-3 md:hidden">{rows.map((row) => <Card key={row.id} className="min-w-0 border-white/10 bg-white/[0.03]"><CardContent className="min-w-0 space-y-3 p-4">{row.cells.map((cell, index) => <div key={`${row.id}-${headers[index]}`}><p className="text-xs text-muted-foreground">{headers[index]}</p><p className="mt-1 break-words text-sm">{cell}</p></div>)}</CardContent></Card>)}</div><Card className="hidden overflow-hidden border-white/10 bg-white/[0.03] md:block"><CardContent className="p-0"><div className="grid gap-4 border-b border-white/10 px-5 py-3 text-xs text-muted-foreground" style={{ gridTemplateColumns: `repeat(${headers.length}, minmax(0, 1fr))` }}>{headers.map((header) => <span key={header}>{header}</span>)}</div>{rows.map((row) => <div key={row.id} className="grid gap-4 border-b border-white/5 px-5 py-4 text-sm last:border-0" style={{ gridTemplateColumns: `repeat(${headers.length}, minmax(0, 1fr))` }}>{row.cells.map((cell, index) => <span key={`${row.id}-${index}`} className="min-w-0 break-words text-muted-foreground first:font-medium first:text-foreground">{cell}</span>)}</div>)}</CardContent></Card></>;
}

function ProductForm() { const { t } = useI18n(); return <><DialogField id="product-name" name="name" label={t("knowledge.fields.productName")} required /><DialogField id="product-category" name="category" label={t("knowledge.fields.productCategory")} /><DialogTextField id="product-description" name="description" label={t("knowledge.fields.productDescription")} /><DialogTextField id="product-features" name="features" label={t("knowledge.fields.productFeatures")} /><DialogTextField id="product-applications" name="applications" label={t("knowledge.fields.productApplications")} /><DialogTextField id="product-customers" name="targetCustomers" label={t("knowledge.fields.targetCustomers")} /></>; }
function ServiceForm() { const { t } = useI18n(); return <><DialogField id="service-name" name="name" label={t("knowledge.fields.serviceName")} required /><DialogTextField id="service-description" name="description" label={t("knowledge.fields.serviceDescription")} /><DialogTextField id="service-industries" name="industries" label={t("knowledge.fields.serviceIndustries")} /></>; }
function CaseForm() { const { t } = useI18n(); return <><DialogField id="case-customer" name="customerName" label={t("knowledge.fields.customerName")} required /><DialogField id="case-industry" name="industry" label={t("knowledge.fields.customerIndustry")} /><DialogTextField id="case-problem" name="problem" label={t("knowledge.fields.caseProblem")} /><DialogTextField id="case-solution" name="solution" label={t("knowledge.fields.caseSolution")} /><DialogTextField id="case-result" name="result" label={t("knowledge.fields.caseResult")} /><DialogTextField id="case-metrics" name="metrics" label={t("knowledge.fields.caseMetrics")} /></>; }

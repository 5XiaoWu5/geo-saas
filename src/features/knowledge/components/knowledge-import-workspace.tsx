"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowRight, BookOpenCheck, FileArchive, FileSpreadsheet, FileText, Globe2, Loader2, PackageCheck, Presentation, RefreshCw, UploadCloud } from "lucide-react";
import { PageHeader } from "@/components/shared/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { KnowledgeImportJob, KnowledgeImportWorkspaceResponse } from "@/features/knowledge/knowledge-document-intelligence.types";
import { formatDateTime } from "@/lib/format";

const acceptedTypes = ".pdf,.docx,.pptx,.xlsx";

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  const body = text ? JSON.parse(text) as T & { error?: string } : {} as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? "REQUEST_FAILED");
  return body;
}

export function KnowledgeImportWorkspace({ projectId }: { projectId: string }) {
  const [data, setData] = useState<KnowledgeImportWorkspaceResponse | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [processingId, setProcessingId] = useState("");
  const [confirming, setConfirming] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const result = await readJson<KnowledgeImportWorkspaceResponse>(await fetch(`/api/knowledge/${projectId}/imports`, { cache: "no-store" }));
    setData(result);
    setSelectedId((current) => result.jobs.some((job) => job.id === current) ? current : result.jobs[0]?.id ?? "");
  }, [projectId]);

  useEffect(() => { void load().catch((requestError) => setError(messageFor(requestError))); }, [load]);

  const selected = useMemo(() => data?.jobs.find((job) => job.id === selectedId) ?? null, [data?.jobs, selectedId]);

  async function uploadFile() {
    if (!file) return;
    setBusy(true); setError("");
    try {
      const formData = new FormData();
      formData.set("file", file);
      const result = await readJson<{ job: KnowledgeImportJob }>(await fetch(`/api/knowledge/${projectId}/imports`, { method: "POST", body: formData }));
      setFile(null);
      await load();
      await processJob(result.job.id);
    } catch (requestError) { setError(messageFor(requestError)); } finally { setBusy(false); }
  }

  async function importWebsite() {
    if (!url.trim()) return;
    setBusy(true); setError("");
    try {
      const result = await readJson<{ job: KnowledgeImportJob }>(await fetch(`/api/knowledge/${projectId}/imports`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sourceType: "WEBSITE_URL", url: url.trim() }) }));
      setUrl("");
      await load();
      await processJob(result.job.id);
    } catch (requestError) { setError(messageFor(requestError)); } finally { setBusy(false); }
  }

  async function confirmProduct(jobId: string, productIndex: number) {
    const key = `${jobId}:${productIndex}`;
    setConfirming(key); setError("");
    try {
      await readJson(await fetch(`/api/knowledge/${projectId}/imports/${jobId}/confirm`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productIndex }) }));
      await load();
    } catch (requestError) { setError(messageFor(requestError)); } finally { setConfirming(""); }
  }

  async function processJob(jobId: string) {
    setProcessingId(jobId); setError("");
    try {
      await readJson<{ job: KnowledgeImportJob }>(await fetch(`/api/knowledge/${projectId}/imports/${jobId}/process`, { method: "POST" }));
      await load();
    } catch (requestError) { setError(messageFor(requestError)); await load(); } finally { setProcessingId(""); }
  }

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <PageHeader title="资料导入" description="上传企业已有文档或导入网站内容，系统会提取真实文本证据并生成待确认的知识建议。" action={<Button asChild variant="outline" className="min-h-11 w-full sm:w-auto"><Link href={`/projects/${projectId}/knowledge`}><BookOpenCheck className="h-4 w-4" />返回企业知识库</Link></Button>} />

      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="min-w-0 space-y-6">
          <Card className="glass-panel overflow-hidden border-white/10">
            <CardHeader className="border-b border-white/10 bg-gradient-to-r from-cyan-400/[0.08] via-transparent to-violet-400/[0.08]"><div className="flex items-start gap-3"><div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-3"><UploadCloud className="h-6 w-6 text-cyan-300" /></div><div><CardTitle>Knowledge Import Center</CardTitle><p className="mt-2 text-sm text-muted-foreground">原始文件不持久化；当前请求内完成解析，仅保存元数据、文本切片与证据引用。</p></div></div></CardHeader>
            <CardContent className="p-5 sm:p-6">
              <Tabs defaultValue="file">
                <TabsList className="grid h-auto w-full grid-cols-2 bg-white/[0.03] p-1"><TabsTrigger value="file" className="min-h-11"><FileArchive className="h-4 w-4" />上传文件</TabsTrigger><TabsTrigger value="website" className="min-h-11"><Globe2 className="h-4 w-4" />网站 URL</TabsTrigger></TabsList>
                <TabsContent value="file" className="mt-5 space-y-4">
                  <label className="flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-cyan-300/30 bg-cyan-300/[0.035] p-6 text-center transition hover:border-cyan-300/60 hover:bg-cyan-300/[0.06]"><input type="file" accept={acceptedTypes} className="sr-only" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /><UploadCloud className="h-9 w-9 text-cyan-300" /><span className="mt-4 font-medium">选择 PPT、Word、PDF 或 Excel</span><span className="mt-2 text-xs text-muted-foreground">支持 .pptx、.docx、.pdf、.xlsx，单文件不超过 10 MB</span></label>
                  {file ? <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4"><DocumentIcon name={file.name} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{file.name}</p><p className="mt-1 text-xs text-muted-foreground">{formatSize(file.size)}</p></div><Button type="button" className="min-h-11 shrink-0" disabled={busy} onClick={() => void uploadFile()}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}上传并解析</Button></div> : null}
                </TabsContent>
                <TabsContent value="website" className="mt-5 space-y-4"><div><label htmlFor="knowledge-url" className="text-sm font-medium">企业网站页面</label><input id="knowledge-url" value={url} onChange={(event) => setUrl(event.target.value)} type="url" placeholder="https://example.com/product" className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary" /></div><Button type="button" className="min-h-11 w-full sm:w-auto" disabled={busy || !url.trim()} onClick={() => void importWebsite()}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe2 className="h-4 w-4" />}导入并解析网站</Button></TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {error ? <div className="flex gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div> : null}
          <ExtractionPanel job={selected} projectId={projectId} confirming={confirming} processing={processingId === selected?.id} onConfirm={confirmProduct} onProcess={processJob} />
        </div>

        <aside className="min-w-0 space-y-4">
          <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">处理状态</p><h2 className="mt-1 text-lg font-semibold">导入记录</h2></div><Button type="button" variant="ghost" size="icon" className="min-h-11 min-w-11" aria-label="刷新导入记录" onClick={() => void load()}><RefreshCw className="h-4 w-4" /></Button></div>
          {data?.jobs.length ? <div className="space-y-3">{data.jobs.map((job) => <button type="button" key={job.id} onClick={() => setSelectedId(job.id)} className={`min-h-24 w-full min-w-0 rounded-2xl border p-4 text-left transition ${selectedId === job.id ? "border-primary/40 bg-primary/[0.09]" : "border-white/10 bg-white/[0.025] hover:border-white/20"}`}><div className="flex min-w-0 items-start gap-3"><DocumentIcon name={job.fileName} website={job.sourceType === "WEBSITE_URL"} /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="truncate text-sm font-medium">{job.fileName}</p><StatusBadge status={job.status} /></div><p className="mt-1 text-xs text-muted-foreground">{formatDateTime(job.createdAt)}</p><Progress value={job.progress} className="mt-3 h-1.5" /></div></div></button>)}</div> : data ? <Card className="border-white/10 bg-white/[0.025]"><CardContent className="p-7 text-center text-sm text-muted-foreground">尚无导入记录。选择企业已有资料开始建立证据。</CardContent></Card> : <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />正在加载导入记录…</div>}
          <Card className="border-white/10 bg-white/[0.025]"><CardContent className="space-y-3 p-4"><p className="text-sm font-medium">继续知识增长流程</p><Button asChild variant="outline" className="min-h-11 w-full justify-between"><Link href={`/projects/${projectId}/knowledge/intelligence`}>查看企业 AI 画像 <ArrowRight className="h-4 w-4" /></Link></Button><Button asChild variant="outline" className="min-h-11 w-full justify-between"><Link href={`/projects/${projectId}/optimization`}>查看知识优化机会 <ArrowRight className="h-4 w-4" /></Link></Button></CardContent></Card>
        </aside>
      </div>
    </div>
  );
}

function ExtractionPanel({ job, projectId, confirming, processing, onConfirm, onProcess }: { job: KnowledgeImportJob | null; projectId: string; confirming: string; processing: boolean; onConfirm: (jobId: string, index: number) => Promise<void>; onProcess: (jobId: string) => Promise<void> }) {
  if (!job) return <Card className="glass-panel border-white/10"><CardContent className="p-7 text-sm text-muted-foreground">选择一条导入记录查看解析结果与待确认内容。</CardContent></Card>;
  if (job.status === "FAILED") return <Card className="border-destructive/30 bg-destructive/[0.06]"><CardContent className="p-6"><div className="flex gap-3"><AlertCircle className="h-5 w-5 shrink-0 text-destructive" /><div><h2 className="font-semibold">解析未完成</h2><p className="mt-2 text-sm text-muted-foreground">{errorLabel(job.errorMessage ?? "IMPORT_FAILED")}</p></div></div></CardContent></Card>;
  if (!job.extraction) return <Card className="glass-panel border-white/10"><CardContent className="p-6"><div className="flex items-center gap-3">{processing ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : <FileText className="h-5 w-5 text-primary" />}<div className="min-w-0 flex-1"><h2 className="font-semibold">{processing ? "正在提取结构化知识" : "文本已解析，等待知识提取"}</h2><p className="mt-1 text-sm text-muted-foreground">当前进度 {job.progress}%，只会生成有文本证据支持的 DRAFT 建议。</p></div></div><Progress value={job.progress} className="mt-5" />{job.status === "PROCESSING" && !processing ? <Button type="button" className="mt-5 min-h-11" onClick={() => void onProcess(job.id)}>继续知识提取 <ArrowRight className="h-4 w-4" /></Button> : null}</CardContent></Card>;
  const extraction = job.extraction;
  const evidenceCount = extraction.extractedAdvantages.length + extraction.extractedFeatures.length + extraction.extractedApplications.length + extraction.extractedCustomers.length + extraction.extractedFAQ.length;
  return <Card className="glass-panel min-w-0 border-white/10"><CardHeader className="flex-row items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">规则提取结果</p><CardTitle className="mt-2">待确认企业知识</CardTitle></div><Badge variant="outline">置信度 {extraction.confidence ?? 0}</Badge></CardHeader><CardContent className="space-y-5">
    {extraction.extractedProducts.length ? extraction.extractedProducts.map((product, index) => <div key={`${product.name}-${index}`} className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.04] p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="break-words font-semibold">{product.name}</h3><Badge variant="secondary">DRAFT</Badge></div><p className="mt-2 text-sm text-muted-foreground">{product.type || "产品类型待确认"}{product.description ? ` · ${product.description}` : ""}</p></div><Button type="button" variant="outline" className="min-h-11 shrink-0" disabled={confirming === `${job.id}:${index}`} onClick={() => void onConfirm(job.id, index)}>{confirming === `${job.id}:${index}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />}创建产品草稿</Button></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><EvidenceList label="核心优势" values={product.advantages} /><EvidenceList label="功能与参数" values={[...product.features, ...product.technicalParameters]} /><EvidenceList label="应用行业" values={product.applications} /><EvidenceList label="目标客户" values={product.targetCustomers} /></div></div>) : <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 text-sm text-muted-foreground">文档中没有足够证据形成产品建议，系统未生成推测内容。</div>}
    <div className="grid gap-3 sm:grid-cols-3"><ResultMetric label="产品建议" value={extraction.extractedProducts.length} /><ResultMetric label="知识证据" value={evidenceCount} /><ResultMetric label="FAQ" value={extraction.extractedFAQ.length} /></div>
    <div className="flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row"><Button asChild className="min-h-11"><Link href={`/projects/${projectId}/knowledge/intelligence`}>重新生成企业画像 <ArrowRight className="h-4 w-4" /></Link></Button><Button asChild variant="outline" className="min-h-11"><Link href={`/projects/${projectId}/optimization`}>进入优化中心</Link></Button></div>
  </CardContent></Card>;
}

function EvidenceList({ label, values }: { label: string; values: string[] }) { return <div className="rounded-xl border border-white/10 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 break-words text-sm">{values.length ? values.slice(0, 5).join("、") : "未提取到证据"}</p></div>; }
function ResultMetric({ label, value }: { label: string; value: number }) { return <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>; }
function StatusBadge({ status }: { status: KnowledgeImportJob["status"] }) { const labels = { UPLOADING: "上传中", PROCESSING: "处理中", COMPLETED: "已完成", FAILED: "失败" }; return <Badge variant={status === "COMPLETED" ? "success" : status === "FAILED" ? "warning" : "secondary"} className="shrink-0">{labels[status]}</Badge>; }
function DocumentIcon({ name, website }: { name: string; website?: boolean }) { if (website) return <Globe2 className="h-5 w-5 shrink-0 text-violet-300" />; if (/\.pptx$/i.test(name)) return <Presentation className="h-5 w-5 shrink-0 text-orange-300" />; if (/\.xlsx$/i.test(name)) return <FileSpreadsheet className="h-5 w-5 shrink-0 text-emerald-300" />; return <FileText className="h-5 w-5 shrink-0 text-cyan-300" />; }
function formatSize(bytes: number) { return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`; }
function messageFor(error: unknown) { return errorLabel(error instanceof Error ? error.message : "REQUEST_FAILED"); }
function errorLabel(code: string) { return ({ UNSUPPORTED_FILE_TYPE: "仅支持 .pptx、.docx、.pdf、.xlsx 文件。", FILE_TOO_LARGE: "文件超过 10 MB，请压缩或拆分后重试。", EMPTY_FILE: "文件内容为空。", NO_EXTRACTABLE_TEXT: "文档中没有可提取文本；扫描版 PDF 暂不支持 OCR。", PDF_PARSE_FAILED: "PDF 文本解析失败。", OFFICE_PARSE_FAILED: "Office 文件结构无效或已损坏。", INVALID_WEBSITE_URL: "请输入有效的公开网站 URL。", PRIVATE_WEBSITE_URL: "不允许导入本地或私有网络地址。", WEBSITE_TIMEOUT: "网站响应超时，请稍后重试。", WEBSITE_FETCH_FAILED: "网站内容读取失败，请确认页面可公开访问。", PROJECT_FORBIDDEN: "没有权限访问该项目。", IMPORT_FAILED: "资料导入失败，请重试。" } as Record<string, string>)[code] ?? code; }

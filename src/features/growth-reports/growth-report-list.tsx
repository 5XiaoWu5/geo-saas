"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OperationFeedback, type OperationStatus } from "@/components/shared/operation-feedback";
import { GuidedEmptyState, GuidedPageHeader, TechnicalDetails } from "@/components/shared/guided-experience";
import type { GrowthReportListItem } from "./types";
import { useI18n } from "@/i18n/provider";

function displayStatus(value: GrowthReportListItem["status"]) { return value === "COMPLETED" ? "已完成" : value === "FAILED" ? "生成失败" : "生成中"; }

export function GrowthReportList({ projectId }: { projectId: string }) {
  const { locale } = useI18n();
  const [reports, setReports] = useState<GrowthReportListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<OperationStatus>("IDLE");
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/reports`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      setReports(((await response.json()) as { reports: GrowthReportListItem[] }).reports);
      setError(null);
    } catch { setError(locale === "zh" ? "暂时无法读取历史报告，请稍后重试。" : "Report history is temporarily unavailable. Try again."); } finally { setLoading(false); }
  }, [locale, projectId]);
  useEffect(() => { void load(); }, [load]);
  async function generate() {
    if (generating) return;
    setGenerating(true); setError(null);
    setFeedback("GENERATING");
    try { const response = await fetch(`/api/projects/${projectId}/reports`, { method: "POST" }); if (!response.ok) throw new Error(); await load(); setFeedback("COMPLETED"); }
    catch { setError(locale === "zh" ? "报告生成失败；系统没有写入虚假结果，请检查数据或稍后重试。" : "Report generation failed. No fabricated result was stored; check the data and try again."); setFeedback("FAILED"); }
    finally { setGenerating(false); }
  }
  const c = locale === "zh" ? { fact: "不可变历史事实层", title: "企业 AI 增长报告", description: "将 SEO、GEO、AI 搜索、知识资产、竞品与优化路线固化为可追溯快照。新数据只会生成新版本，不会改写旧报告。", generating: "正在生成", generate: "生成新报告", history: "历史报告", historyDescription: "所有完成版本只读保存，最多展示最近 200 份。", empty: "尚未生成报告。即使当前暂无数据，也可以生成一份明确标记 unavailable 的基线报告。", dataVersion: "数据版本", methodVersion: "方法版本", evidence: "证据覆盖", detail: "查看只读详情" } : { fact: "Immutable historical fact layer", title: "Enterprise AI Growth Reports", description: "Preserve SEO, GEO, AI search, knowledge, competitor, and optimization evidence in traceable snapshots. New data creates a new version and never rewrites an old report.", generating: "Generating", generate: "Generate new report", history: "Report history", historyDescription: "Completed versions remain read-only. The latest 200 reports are shown.", empty: "No report has been generated. You can create an unavailable baseline even when no evidence exists.", dataVersion: "Data version", methodVersion: "Method version", evidence: "Evidence coverage", detail: "View read-only report" };
  return <div className="min-w-0 space-y-6 overflow-x-hidden" data-testid="growth-report-list">
    <GuidedPageHeader title={c.title} description={c.description} status={reports.length ? (locale === "zh" ? `已保存 ${reports.length} 份只读历史报告` : `${reports.length} read-only historical reports saved`) : (locale === "zh" ? "尚未建立增长基线报告" : "No growth baseline report yet")} action={<Button onClick={generate} disabled={generating} className="min-h-11 w-full gap-2 sm:w-auto">{generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}{generating ? c.generating : c.generate}</Button>} />
    {feedback !== "IDLE" ? <OperationFeedback status={feedback} message={error ?? (feedback === "COMPLETED" ? (locale === "zh" ? "新的不可变报告快照已创建。" : "A new immutable report snapshot was created.") : undefined)} /> : null}
    <section className="space-y-3"><div><h2 className="text-xl font-semibold">{c.history}</h2><p className="mt-1 text-sm text-muted-foreground">{c.historyDescription}</p></div>
      {loading ? <Card><CardContent className="flex min-h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></CardContent></Card> : reports.length === 0 ? <GuidedEmptyState title={locale === "zh" ? "还没有增长报告" : "No growth report yet"} reason={c.empty} instruction={locale === "zh" ? "生成第一份报告，保存当前真实数据作为后续对比基线。" : "Generate the first report to preserve the current real-data baseline."} action={<Button onClick={generate} disabled={generating} className="min-h-11"><Plus className="h-4 w-4" />{c.generate}</Button>} /> : <div className="grid gap-3 lg:grid-cols-2">{reports.map((report) => <Card key={report.id} className="min-w-0 border-white/10 bg-card/70"><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle>{locale === "zh" ? `增长报告 v${report.version}` : `Growth Report v${report.version}`}</CardTitle><CardDescription className="mt-1">{new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(report.createdAt))}</CardDescription></div><span className="rounded-full border border-white/10 px-2.5 py-1 text-xs">{locale === "zh" ? displayStatus(report.status) : report.status === "COMPLETED" ? "Completed" : report.status === "FAILED" ? "Failed" : "Processing"}</span></div></CardHeader><CardContent className="space-y-4"><p className="text-sm text-muted-foreground">{c.evidence}：{report.confidence === null ? (locale === "zh" ? "暂无数据" : "Unavailable") : `${report.confidence}%`}</p><TechnicalDetails><div className="grid gap-2 text-xs text-muted-foreground"><span className="break-all">{c.dataVersion}：{report.dataVersion}</span><span>{c.methodVersion}：{report.methodVersion}</span></div></TechnicalDetails><Button asChild variant="outline" className="min-h-11 w-full justify-between"><Link href={`/projects/${projectId}/reports/${report.id}`}>{c.detail}<ArrowRight className="h-4 w-4" /></Link></Button></CardContent></Card>)}</div>}
    </section>
  </div>;
}

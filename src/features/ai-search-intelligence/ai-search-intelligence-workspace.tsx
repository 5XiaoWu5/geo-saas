"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AlertCircle, ArrowRight, Bot, BrainCircuit, CheckCircle2, FileSearch, Loader2, Radar, RefreshCw, ShieldCheck, Target } from "lucide-react";
import { PageHeader } from "@/components/shared/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AI_SEARCH_INTENTS, AI_SEARCH_PLATFORMS, type AIRecommendationSignal, type AISearchIntelligenceResponse, type AISearchIntent, type AISearchPlatform } from "./types";

const platformLabels: Record<AISearchPlatform, string> = { CHATGPT: "ChatGPT", GEMINI: "Gemini", CLAUDE: "Claude", PERPLEXITY: "Perplexity" };
const intentLabels: Record<AISearchIntent, string> = { BUYING: "购买决策", RESEARCH: "行业研究", COMPARISON: "方案比较", LOCAL_SEARCH: "本地搜索", TECHNICAL: "技术评估" };

async function readJson<T>(response: Response): Promise<T> { const text = await response.text(); const body = text ? JSON.parse(text) as T & { error?: string } : {} as T & { error?: string }; if (!response.ok) throw new Error(body.error ?? "请求失败"); return body; }

export function AISearchIntelligenceWorkspace({ projectId }: { projectId: string }) {
  const [data, setData] = useState<AISearchIntelligenceResponse | null>(null);
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState<AISearchPlatform>("CHATGPT");
  const [intent, setIntent] = useState<AISearchIntent>("RESEARCH");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    const result = await readJson<AISearchIntelligenceResponse>(await fetch(`/api/ai-search-intelligence/${projectId}`, { cache: "no-store" }));
    setData(result); setQuery((current) => current || result.context.query); setPlatform(result.context.platform); setIntent(result.context.intent);
  }, [projectId]);
  useEffect(() => { let active = true; void load().catch((requestError) => { if (active) setError(requestError instanceof Error ? requestError.message : "诊断加载失败"); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [load]);

  async function evaluate() {
    if (query.trim().length < 3) { setError("请输入至少 3 个字符的真实搜索问题。"); return; }
    setBusy(true); setError("");
    try { setData(await readJson<AISearchIntelligenceResponse>(await fetch(`/api/ai-search-intelligence/${projectId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: query.trim(), platform, intent }) }))); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "诊断失败"); }
    finally { setBusy(false); }
  }

  if (loading && !data) return <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />正在读取 AI 搜索证据…</div>;
  return <div className="min-w-0 space-y-6 overflow-x-hidden">
    <PageHeader title="AI 搜索增长诊断" description="解释 AI 为什么可能不了解或不推荐企业。所有评分、问题和建议都来自当前项目的可追溯证据。" action={<Button asChild variant="outline" className="min-h-11 w-full sm:w-auto"><Link href={`/projects/${projectId}/geo`}><ArrowRight className="h-4 w-4 rotate-180" />返回 AI 搜索增长</Link></Button>} />
    {error ? <div className="flex gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div> : null}
    <Card className="glass-panel overflow-hidden border-violet-300/20"><CardContent className="grid gap-5 p-5 lg:grid-cols-[0.8fr_1.2fr]"><div className="flex min-h-56 flex-col items-center justify-center rounded-3xl border border-violet-300/20 bg-violet-300/[0.04] p-6 text-center"><Radar className="h-7 w-7 text-violet-300" /><p className="mt-4 text-sm text-muted-foreground">AI Search Health Score</p><p className="mt-2 text-6xl font-semibold tracking-tight text-violet-200">{data?.analysis.healthScore ?? "--"}</p><p className="mt-2 text-xs text-muted-foreground">推荐准备度 · 置信覆盖 {data?.analysis.confidence ?? "--"}%</p>{data?.analysis.healthScore !== null && data?.analysis.healthScore !== undefined ? <Progress value={data.analysis.healthScore} className="mt-5 max-w-xs" /> : null}</div><div className="min-w-0"><div className="grid gap-3 sm:grid-cols-2"><Field label="测试平台"><select value={platform} onChange={(event) => setPlatform(event.target.value as AISearchPlatform)} className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm">{AI_SEARCH_PLATFORMS.map((item) => <option key={item} value={item}>{platformLabels[item]}</option>)}</select></Field><Field label="搜索意图"><select value={intent} onChange={(event) => setIntent(event.target.value as AISearchIntent)} className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm">{AI_SEARCH_INTENTS.map((item) => <option key={item} value={item}>{intentLabels[item]}</option>)}</select></Field></div><Field label="真实搜索问题"><textarea value={query} onChange={(event) => setQuery(event.target.value)} rows={3} placeholder="例如：适合制造企业的 AI 搜索增长平台有哪些？" className="mt-2 min-h-24 w-full resize-y rounded-xl border border-input bg-background px-3 py-3 text-sm" /></Field><Button type="button" onClick={() => void evaluate()} disabled={busy} className="mt-4 min-h-11 w-full sm:w-auto">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}重新诊断并同步优化任务</Button><p className="mt-3 text-xs text-muted-foreground">规则诊断，不调用外部 AI API。刷新后会保存 Evaluation Profile，并幂等同步诊断缺口。</p></div></CardContent></Card>
    {data?.analysis.status === "unavailable" ? <Card className="border-amber-300/20 bg-amber-300/[0.04]"><CardContent className="p-6"><p className="font-medium text-amber-200">诊断暂不可用</p><p className="mt-2 text-sm text-muted-foreground">{data.analysis.unavailableReason}</p></CardContent></Card> : null}
    {data ? <><section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><Metric label="Entity Authority" signal={findSignal(data, "ENTITY_TRUST")} /><Metric label="Knowledge Completeness" signal={findSignal(data, "KNOWLEDGE_COMPLETENESS")} /><Metric label="Recommendation Probability" value={data.analysis.recommendationProbability} /><Metric label="Citation Strength" signal={findSignal(data, "CITATION_POTENTIAL")} /><Metric label="Competitor Gap" signal={findSignal(data, "COMPETITIVE_GAP")} /></section><section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]"><Card className="glass-panel min-w-0 border-white/10"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><BrainCircuit className="h-5 w-5 text-violet-300" />AI Recommendation Signals</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2">{data.analysis.signals.map((signal) => <SignalCard key={signal.type} signal={signal} />)}</CardContent></Card><Card className="glass-panel min-w-0 border-white/10"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Target className="h-5 w-5 text-rose-300" />为什么 AI 不了解你的企业</CardTitle></CardHeader><CardContent className="space-y-3">{data.analysis.issues.length ? data.analysis.issues.map((issue) => <article key={issue.type} className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"><div className="flex flex-wrap gap-2"><Badge variant={issue.severity === "LOW" ? "muted" : "warning"}>{issue.severity}</Badge><Badge variant="outline">{issue.signalType}</Badge></div><h3 className="mt-3 text-sm font-semibold">{issue.reason}</h3><p className="mt-2 text-sm text-muted-foreground">{issue.recommendation}</p><p className="mt-3 text-xs text-muted-foreground">来源 {issue.sources.length} 条 · {issue.opportunitySource}</p></article>) : <div className="flex items-center gap-2 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.04] p-4 text-sm text-emerald-200"><CheckCircle2 className="h-4 w-4" />当前证据未发现低于阈值的 AI 推荐缺口。</div>}</CardContent></Card></section><NextModules projectId={projectId} /></> : null}
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="mt-3 block text-sm font-medium"><span className="mb-2 block">{label}</span>{children}</label>; }
function findSignal(data: AISearchIntelligenceResponse, type: AIRecommendationSignal["type"]) { return data.analysis.signals.find((item) => item.type === type); }
function Metric({ label, signal, value }: { label: string; signal?: AIRecommendationSignal; value?: number | null }) { const score = signal ? signal.score : value; return <Card className="glass-panel min-w-0 border-white/10"><CardContent className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-3 text-3xl font-semibold">{score ?? "--"}</p><p className="mt-2 text-xs text-muted-foreground">{signal?.status === "unavailable" ? "unavailable" : score === null || typeof score === "undefined" ? "暂无模拟证据" : "可追溯评分"}</p></CardContent></Card>; }
function SignalCard({ signal }: { signal: AIRecommendationSignal }) { return <article className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.025] p-4"><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">{signal.label}</h3><span className="font-mono text-lg">{signal.score ?? "--"}</span></div><Progress value={signal.score ?? 0} className="mt-3" /><p className="mt-3 text-xs leading-5 text-muted-foreground">{signal.explanation}</p><div className="mt-3 flex flex-wrap gap-1.5">{signal.sources.slice(0, 4).map((item) => <Badge key={`${item.sourceType}-${item.sourceId}`} variant="outline" title={item.sourceId}>{item.sourceType}</Badge>)}{!signal.sources.length ? <Badge variant="muted">unavailable</Badge> : null}</div></article>; }
function NextModules({ projectId }: { projectId: string }) { const links = [{ label: "企业知识画像", href: `/projects/${projectId}/knowledge/intelligence`, icon: ShieldCheck }, { label: "AI 搜索模拟器", href: `/projects/${projectId}/simulator`, icon: Bot }, { label: "AI 可见性", href: `/projects/${projectId}/visibility`, icon: Radar }, { label: "竞品基准", href: `/projects/${projectId}/competitors`, icon: FileSearch }, { label: "优化中心", href: `/projects/${projectId}/optimization`, icon: Target }]; return <section><p className="mb-3 text-sm font-medium">继续 AI 搜索增长流程</p><div className="flex gap-3 overflow-x-auto pb-2" aria-label="AI 诊断后续模块">{links.map(({ label, href, icon: Icon }) => <Button key={href} asChild variant="outline" className="min-h-11 shrink-0"><Link href={href}><Icon className="h-4 w-4" />{label}<ArrowRight className="h-4 w-4" /></Link></Button>)}</div></section>; }

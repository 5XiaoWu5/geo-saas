"use client";
/* eslint-disable @next/next/no-img-element -- provider marks are small brand assets */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Clock3,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  Play,
  Radar,
  Save,
  Server,
  XCircle,
} from "lucide-react";
import { OperationFeedback, type OperationStatus } from "@/components/shared/operation-feedback";
import { PageHeader } from "@/components/shared/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n/provider";
import { PROVIDER_METADATA } from "./provider-metadata";
import {
  AI_SEARCH_PROVIDER_TYPES,
  DEFAULT_PROVIDER_MODELS,
  PROVIDER_LABELS,
  type AISearchProviderType,
  type MonitoringResponse,
  type ProviderStats,
} from "./types";

async function json<T>(response: Response): Promise<T> {
  const text = await response.text();
  const body = text ? JSON.parse(text) as T & { error?: string } : {} as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? "REQUEST_FAILED");
  return body;
}

export function RealAISearchMonitoringWorkspace({ projectId }: { projectId: string }) {
  const { locale, t } = useI18n();
  const [data, setData] = useState<MonitoringResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [provider, setProvider] = useState<AISearchProviderType>("OPENAI");
  const [query, setQuery] = useState("");
  const [intent, setIntent] = useState("RESEARCH");
  const [executionStatus, setExecutionStatus] = useState<OperationStatus>("IDLE");

  const load = useCallback(async () => {
    setData(await json<MonitoringResponse>(await fetch(`/api/ai-search-execution/${projectId}`, { cache: "no-store" })));
  }, [projectId]);

  useEffect(() => {
    let active = true;
    void load()
      .catch(requestError => {
        if (active) setError(requestError instanceof Error ? requestError.message : "REQUEST_FAILED");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [load]);

  const connected = useMemo(
    () => data?.providers.filter(item => item.config.enabled && item.config.configured).length ?? 0,
    [data?.providers],
  );
  const nextStep = connected === 0
    ? t("providerUx.connectNext")
    : data?.results.length
      ? t("providerUx.performanceNext")
      : t("providerUx.runNext");

  async function execute() {
    if (busy || query.trim().length < 3) return;
    setBusy("execute");
    setError("");
    setExecutionStatus("RUNNING");
    try {
      setData(await json<MonitoringResponse>(await fetch(`/api/ai-search-execution/${projectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, query, intent }),
      })));
      setExecutionStatus("COMPLETED");
    } catch (requestError) {
      const code = requestError instanceof Error ? requestError.message : "REQUEST_FAILED";
      setError(code);
      setExecutionStatus("FAILED");
      await load().catch(() => undefined);
    } finally {
      setBusy("");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
        {locale === "zh" ? "正在读取真实 AI 平台状态…" : "Loading real AI provider status…"}
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <PageHeader
        title={locale === "zh" ? "真实 AI 搜索监控" : "Real AI Search Monitoring"}
        description={locale === "zh"
          ? "连接 AI 平台、运行真实检测并保留可核对的成功与失败记录。"
          : "Connect AI platforms, run real checks, and retain auditable success and failure records."}
        action={(
          <Button asChild variant="outline" className="min-h-11 w-full sm:w-auto">
            <Link href={`/projects/${projectId}/geo`}>
              <ArrowRight className="h-4 w-4 rotate-180" />
              {locale === "zh" ? "返回 AI 搜索增长" : "Back to AI Search Growth"}
            </Link>
          </Button>
        )}
      />

      {error ? (
        <OperationFeedback
          status="FAILED"
          message={providerErrorMessage(t, error)}
        />
      ) : null}

      <Card className="overflow-hidden border-violet-300/20 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,.12),transparent_42%)]">
        <CardContent className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-violet-200">
              <KeyRound className="h-5 w-5" />
              <h2 className="text-lg font-semibold">{t("providerUx.title")}</h2>
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{t("providerUx.description")}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/15 p-4 lg:min-w-72">
            <p className="text-sm font-medium">{t("providerUx.connectedProgress", { connected, total: AI_SEARCH_PROVIDER_TYPES.length })}</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.07]">
              <div
                className="h-full rounded-full bg-emerald-300 transition-[width] motion-reduce:transition-none"
                style={{ width: `${connected / AI_SEARCH_PROVIDER_TYPES.length * 100}%` }}
              />
            </div>
            <p className="mt-3 text-xs text-muted-foreground"><strong>{t("providerUx.nextStep")}：</strong>{nextStep}</p>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 xl:grid-cols-2">
        {data?.providers.map(item => (
          <ProviderCard
            key={item.provider}
            projectId={projectId}
            stats={item}
            busy={busy}
            setBusy={setBusy}
            setError={setError}
            onSaved={load}
          />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="glass-panel min-w-0 border-white/10">
          <CardHeader>
            <CardTitle>{locale === "zh" ? "配置流程" : "Setup process"}</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="grid gap-3 sm:grid-cols-5">
              {(["get", "signIn", "create", "paste", "test"] as const).map((step, index) => (
                <li key={step} className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                  <span className="text-xs text-violet-300">{locale === "zh" ? `第 ${index + 1} 步` : `Step ${index + 1}`}</span>
                  <p className="mt-2 text-sm font-medium">{t(`providerUx.setupSteps.${step}`)}</p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card className="glass-panel min-w-0 border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-emerald-300" />
              {locale === "zh" ? "运行真实检测" : "Run a real check"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="real-provider">{locale === "zh" ? "AI 平台" : "AI provider"}</Label>
                <Select id="real-provider" className="min-h-11" value={provider} onChange={event => setProvider(event.target.value as AISearchProviderType)}>
                  {AI_SEARCH_PROVIDER_TYPES.map(value => <option value={value} key={value}>{PROVIDER_LABELS[value]}</option>)}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="real-intent">{locale === "zh" ? "搜索意图" : "Search intent"}</Label>
                <Select id="real-intent" className="min-h-11" value={intent} onChange={event => setIntent(event.target.value)}>
                  <option value="RESEARCH">{locale === "zh" ? "行业研究" : "Research"}</option>
                  <option value="BUYING">{locale === "zh" ? "购买决策" : "Buying"}</option>
                  <option value="COMPARISON">{locale === "zh" ? "方案比较" : "Comparison"}</option>
                  <option value="LOCAL_SEARCH">{locale === "zh" ? "本地搜索" : "Local search"}</option>
                  <option value="TECHNICAL">{locale === "zh" ? "技术评估" : "Technical"}</option>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="real-query">{locale === "zh" ? "真实查询问题" : "Real search query"}</Label>
              <Textarea
                id="real-query"
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder={locale === "zh" ? "例如：推荐广州环保设备厂家" : "Example: Recommend environmental equipment manufacturers"}
                className="min-h-28"
              />
            </div>
            {executionStatus !== "IDLE" ? (
              <OperationFeedback
                status={executionStatus}
                message={executionStatus === "COMPLETED"
                  ? (locale === "zh" ? "真实检测结果已写入监控历史。" : "The real result was saved to monitoring history.")
                  : undefined}
              />
            ) : null}
            <Button
              className="min-h-11 w-full sm:w-auto"
              disabled={busy !== "" || query.trim().length < 3}
              onClick={() => void execute()}
            >
              {busy === "execute" ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Play className="h-4 w-4" />}
              {locale === "zh" ? "运行真实检测" : "Run real check"}
            </Button>
          </CardContent>
        </Card>
      </section>

      <Card className="glass-panel min-w-0 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radar className="h-5 w-5 text-violet-300" />
            {locale === "zh" ? "最近真实检测" : "Recent real checks"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data?.results.length ? data.results.map(result => (
            <article key={result.id} className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={result.status === "SUCCEEDED" ? "success" : result.status === "FAILED" ? "warning" : "outline"}>{result.status}</Badge>
                <Badge variant="outline">{PROVIDER_LABELS[result.provider]}</Badge>
                {result.mentioned !== null ? (
                  <Badge variant={result.mentioned ? "success" : "warning"}>
                    {result.mentioned
                      ? (locale === "zh" ? "品牌已出现" : "Brand mentioned")
                      : (locale === "zh" ? "品牌未出现" : "Brand not mentioned")}
                  </Badge>
                ) : null}
              </div>
              <p className="mt-3 break-words text-sm font-medium">{result.query}</p>
              <p className="mt-2 line-clamp-3 break-words text-sm text-muted-foreground">
                {result.rawResponse ?? providerErrorMessage(t, result.errorCode ?? "PROVIDER_UNKNOWN_ERROR")}
              </p>
            </article>
          )) : (
            <p className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 text-sm text-muted-foreground">
              {locale === "zh"
                ? "暂无真实检测记录。完成平台配置后运行首次检测。"
                : "No real checks yet. Configure a provider to run the first check."}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex max-w-full gap-3 overflow-x-auto pb-2" aria-label={locale === "zh" ? "后续模块" : "Next modules"}>
        <Button asChild variant="outline" className="min-h-11 shrink-0">
          <Link href={`/projects/${projectId}/visibility`}>{t("metrics.aiVisibility")}<ArrowRight className="h-4 w-4" /></Link>
        </Button>
        <Button asChild variant="outline" className="min-h-11 shrink-0">
          <Link href={`/projects/${projectId}/optimization`}>
            {locale === "zh" ? "优化中心" : "Optimization Center"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

type ProviderCardStatus = "unconfigured" | "configured" | "testing" | "success" | "failed" | "unavailable" | "disabled";

function ProviderCard({
  projectId,
  stats,
  onSaved,
  busy,
  setBusy,
  setError,
}: {
  projectId: string;
  stats: ProviderStats;
  onSaved: () => Promise<void>;
  busy: string;
  setBusy: (value: string) => void;
  setError: (value: string) => void;
}) {
  const { locale, t } = useI18n();
  const meta = PROVIDER_METADATA[stats.provider];
  const [enabled, setEnabled] = useState(stats.config.id ? stats.config.enabled : true);
  const [model, setModel] = useState(stats.config.model || DEFAULT_PROVIDER_MODELS[stats.provider]);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ status: OperationStatus; message?: string } | null>(null);

  useEffect(() => {
    setEnabled(stats.config.id ? stats.config.enabled : true);
    setModel(stats.config.model || DEFAULT_PROVIDER_MODELS[stats.provider]);
  }, [stats.config.enabled, stats.config.id, stats.config.model, stats.provider]);

  const testing = busy === `test:${stats.provider}`;
  const saving = busy === `save:${stats.provider}`;
  const status: ProviderCardStatus = testing
    ? "testing"
    : feedback?.status === "COMPLETED"
      ? "success"
      : feedback?.status === "FAILED"
        ? "failed"
        : !enabled
          ? "disabled"
          : stats.config.lastTestStatus === "FAILED"
            ? "failed"
            : stats.config.lastTestStatus === "SUCCEEDED"
              ? "success"
              : stats.config.configured
                ? "configured"
                : !stats.config.secretStorageAvailable
                  ? "unavailable"
                  : "unconfigured";
  const statusLabel = {
    unconfigured: t("providerUx.unconfigured"),
    configured: t("providerUx.configured"),
    testing: t("providerUx.testingStatus"),
    success: t("providerUx.connectionSuccess"),
    failed: t("providerUx.connectionFailed"),
    unavailable: t("providerUx.unavailableStatus"),
    disabled: t("providerUx.disabled"),
  }[status];
  const canTest = enabled && (apiKey.trim().length >= 8 || stats.config.configured);
  const canSave = stats.config.secretStorageAvailable
    ? apiKey.trim().length >= 8 || stats.config.configured
    : stats.config.configured;

  async function save() {
    if (busy || !canSave) return;
    setBusy(`save:${stats.provider}`);
    setError("");
    setFeedback({ status: "VALIDATING" });
    try {
      await json(await fetch(`/api/ai-search-providers/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: stats.provider,
          enabled,
          model,
          ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
        }),
      }));
      setApiKey("");
      setFeedback({ status: "COMPLETED", message: t("providerUx.saveSuccessDescription") });
      await onSaved();
    } catch (requestError) {
      const code = requestError instanceof Error ? requestError.message : "REQUEST_FAILED";
      setFeedback({ status: "FAILED", message: providerErrorMessage(t, code) });
    } finally {
      setBusy("");
    }
  }

  async function test() {
    if (busy || !canTest) return;
    setTestDialogOpen(false);
    setBusy(`test:${stats.provider}`);
    setError("");
    setFeedback({ status: "RUNNING", message: t("providerUx.testing") });
    try {
      await json(await fetch(`/api/ai-search-providers/${projectId}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: stats.provider,
          approvedExternalRequest: true,
          model,
          ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
        }),
      }));
      setFeedback({
        status: "COMPLETED",
        message: t("providerUx.testSuccessDescription", { provider: meta.name }),
      });
      await onSaved();
    } catch (requestError) {
      const code = requestError instanceof Error ? requestError.message : "PROVIDER_UNKNOWN_ERROR";
      setFeedback({ status: "FAILED", message: providerErrorMessage(t, code) });
      await onSaved().catch(() => undefined);
    } finally {
      setBusy("");
    }
  }

  return (
    <article className="min-w-0 rounded-3xl border border-white/10 bg-white/[0.025] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-slate-950">
            <img src={meta.logo} alt={`${meta.name} logo`} className="h-7 w-7" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold">{meta.name}</h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{meta.description[locale]}</p>
          </div>
        </div>
        <Badge variant={status === "success" ? "success" : status === "failed" ? "warning" : "muted"} className="w-fit">
          {testing ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin motion-reduce:animate-none" /> : null}
          {statusLabel}
        </Badge>
      </div>

      <div className="mt-4 rounded-2xl border border-sky-300/15 bg-sky-300/[0.05] p-4">
        <div className="flex items-start gap-2">
          <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-sky-200" />
          <div>
            <p className="text-xs font-medium text-sky-100">{t("providerUx.securityTitle")}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{t("providerUx.securityDescription")}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Button asChild className="min-h-11">
          <a href={meta.apiKeyUrl} target="_blank" rel="noreferrer noopener">
            {t("providerUx.getKey")}<ExternalLink className="h-4 w-4" />
          </a>
        </Button>
        <Button asChild variant="outline" className="min-h-11">
          <a href={meta.docsUrl} target="_blank" rel="noreferrer noopener">
            {t("providerUx.docs")}<ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      </div>

      <details className="group mt-3 rounded-2xl border border-white/10">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-4 text-sm font-medium">
          {t("providerUx.tutorial")}
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
        </summary>
        <ol className="grid gap-2 border-t border-white/10 px-4 py-3 text-xs leading-5 text-muted-foreground">
          {(["get", "signIn", "create", "paste", "test"] as const).map((step, index) => (
            <li key={step}>{index + 1}. {t(`providerUx.setupSteps.${step}`)}</li>
          ))}
        </ol>
      </details>

      <div className="mt-4 grid gap-4">
        <div>
          <Label htmlFor={`${stats.provider}-model`}>{t("providerUx.model")}</Label>
          <Input
            id={`${stats.provider}-model`}
            className="mt-2 min-h-11"
            value={model}
            onChange={event => setModel(event.target.value)}
          />
        </div>
        <div>
          <Label htmlFor={`${stats.provider}-api-key`}>{t("providerUx.apiKey")}</Label>
          {stats.config.keyMask ? (
            <p className="mt-2 text-xs text-muted-foreground">{t("providerUx.configuredMask", { mask: stats.config.keyMask })}</p>
          ) : null}
          <div className="relative mt-2">
            <Input
              id={`${stats.provider}-api-key`}
              type={showKey ? "text" : "password"}
              autoComplete="new-password"
              spellCheck={false}
              className="min-h-11 pr-12"
              value={apiKey}
              onChange={event => setApiKey(event.target.value)}
              placeholder={t("providerUx.apiKeyPlaceholder")}
              disabled={!stats.config.secretStorageAvailable}
            />
            <button
              type="button"
              className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => setShowKey(current => !current)}
              aria-label={showKey ? t("providerUx.hideKey") : t("providerUx.showKey")}
              disabled={!stats.config.secretStorageAvailable}
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {!stats.config.secretStorageAvailable && !stats.config.configured ? (
            <p className="mt-2 text-xs leading-5 text-amber-200">{t("providerUx.storageUnavailable")}</p>
          ) : null}
        </div>
      </div>

      <label className="mt-3 flex min-h-11 items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={enabled}
          onChange={event => setEnabled(event.target.checked)}
          className="h-4 w-4"
        />
        {t("providerUx.enabled")}
      </label>

      {feedback ? <OperationFeedback className="mt-3" status={feedback.status} message={feedback.message} /> : null}

      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        <strong>{t("providerUx.nextStep")}：</strong>
        {status === "success"
          ? (locale === "zh" ? "运行第一次 AI 搜索检测" : "Run your first AI search check")
          : t("providerUx.flow")}
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Button
          variant="outline"
          className="min-h-11"
          disabled={busy !== "" || !canSave}
          onClick={() => void save()}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Save className="h-4 w-4" />}
          {saving ? t("providerUx.saving") : t("providerUx.save")}
        </Button>
        <Button
          className="min-h-11"
          disabled={busy !== "" || !canTest}
          onClick={() => setTestDialogOpen(true)}
        >
          {testing ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Server className="h-4 w-4" />}
          {testing ? t("providerUx.testing") : t("providerUx.test")}
        </Button>
      </div>

      {stats.config.lastTestedAt ? (
        <p className="mt-3 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <Clock3 className="h-3.5 w-3.5" />
          {new Date(stats.config.lastTestedAt).toLocaleString(locale === "zh" ? "zh-CN" : "en-US")}
          {stats.config.lastTestStatus === "SUCCEEDED"
            ? <CheckCircle2 className="ml-1 h-3.5 w-3.5 text-emerald-300" />
            : <XCircle className="ml-1 h-3.5 w-3.5 text-rose-300" />}
        </p>
      ) : null}

      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent>
          <DialogTitle className="pr-12 text-lg font-semibold">{t("providerUx.confirmTestTitle")}</DialogTitle>
          <DialogDescription className="mt-3 text-sm leading-6 text-muted-foreground">
            {t("providerUx.confirmTestDescription", { provider: meta.name })}
          </DialogDescription>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <DialogClose asChild>
              <Button variant="outline" className="min-h-11">{locale === "zh" ? "返回" : "Back"}</Button>
            </DialogClose>
            <Button className="min-h-11" onClick={() => void test()}>
              <Server className="h-4 w-4" />{t("providerUx.confirmTest")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </article>
  );
}

function providerErrorMessage(t: (key: string, values?: Record<string, string | number>) => string, code: string) {
  const key = `providerUx.errors.${code}`;
  const translated = t(key);
  return translated === key ? t("providerUx.errors.PROVIDER_UNKNOWN_ERROR") : translated;
}

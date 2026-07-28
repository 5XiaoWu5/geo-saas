"use client";

import {
  Check,
  ChevronRight,
  KeyRound,
  Layers3,
  Loader2,
  Network,
  Plus,
  Search,
  Server,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { TechnicalDetails } from "@/components/shared/guided-experience";
import { useI18n } from "@/i18n/provider";
import {
  AI_SEARCH_GATEWAY_PROTOCOLS,
  AI_SEARCH_MODEL_FAMILIES,
  type AISearchGatewayProtocol,
  type AISearchModelFamily,
  type GatewayConnectionView,
  type GatewayModelCandidate,
} from "./gateway-types";

type SelectedModel = GatewayModelCandidate & { isDefault: boolean };

const PROTOCOL_LABELS: Record<AISearchGatewayProtocol, string> = {
  OPENAI_COMPATIBLE: "OpenAI-compatible",
  ANTHROPIC_COMPATIBLE: "Anthropic-compatible",
  GEMINI_COMPATIBLE: "Gemini-compatible",
};

const FAMILY_LABELS: Record<AISearchModelFamily, string> = {
  OPENAI: "OpenAI",
  GEMINI: "Gemini",
  CLAUDE: "Claude",
  PERPLEXITY: "Perplexity",
};

function gatewayError(code: string, zh: boolean) {
  const messages: Record<string, [string, string]> = {
    API_KEY_INVALID: ["API Key 无效，请确认后重试。", "The API key is invalid."],
    API_KEY_PERMISSION_DENIED: ["该 Key 没有读取模型或调用模型的权限。", "This key cannot list or call models."],
    ACCOUNT_BALANCE_INSUFFICIENT: [
      "当前账户余额不足。GeoPilot 已成功连接到该服务商，但服务商拒绝执行模型请求。请充值服务商账户，或更换一个有余额的 API Key。",
      "The gateway connection succeeded, but the provider rejected the model request because the account has insufficient balance. Add credit to the provider account or use an API key with available balance.",
    ],
    GATEWAY_MODELS_EMPTY: ["连接成功，但该网关没有返回可用模型。", "Connected, but the gateway returned no models."],
    GATEWAY_NAME_EXISTS: ["该项目已经存在同名连接。", "A connection with this name already exists."],
    COMPATIBLE_BASE_URL_PRIVATE_NETWORK: ["出于安全原因，不能连接私网或本机地址。", "Private or local addresses are blocked."],
    COMPATIBLE_BASE_URL_HTTPS_REQUIRED: ["生产环境只允许 HTTPS 网关。", "Production gateways must use HTTPS."],
    PROVIDER_TIMEOUT: ["网关响应超时，请稍后重试。", "The gateway timed out."],
    PROVIDER_NETWORK_ERROR: ["无法连接该网关，请检查地址、DNS 或服务状态。", "The gateway could not be reached."],
  };
  return (messages[code] ?? [
    `连接失败（${code || "GATEWAY_REQUEST_FAILED"}）。`,
    `Connection failed (${code || "GATEWAY_REQUEST_FAILED"}).`,
  ])[zh ? 0 : 1];
}

export function GatewayConnectionsPanel({ projectId }: { projectId: string }) {
  const { locale } = useI18n();
  const zh = locale === "zh";
  const [connections, setConnections] = useState<GatewayConnectionView[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [protocol, setProtocol] = useState<AISearchGatewayProtocol>("OPENAI_COMPATIBLE");
  const [apiKey, setApiKey] = useState("");
  const [models, setModels] = useState<GatewayModelCandidate[]>([]);
  const [selected, setSelected] = useState<Map<string, SelectedModel>>(new Map());
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<"discover" | "save" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GatewayConnectionView | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/provider-connections`, { cache: "no-store" });
      const body = await response.json() as { connections?: GatewayConnectionView[] };
      if (response.ok) setConnections(body.connections ?? []);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { void load(); }, [load]);

  const reset = () => {
    setName("");
    setBaseUrl("");
    setProtocol("OPENAI_COMPATIBLE");
    setApiKey("");
    setModels([]);
    setSelected(new Map());
    setSearch("");
    setError(null);
    setBusy(null);
  };

  const discover = async () => {
    setBusy("discover");
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/provider-connections/discover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, baseUrl, protocol, apiKey, approvedExternalRequest: true }),
      });
      const body = await response.json() as { models?: GatewayModelCandidate[]; error?: string };
      if (!response.ok) throw new Error(body.error ?? "GATEWAY_DISCOVERY_FAILED");
      setModels(body.models ?? []);
      setSelected(new Map());
    } catch (cause) {
      setError(gatewayError(cause instanceof Error ? cause.message : "", zh));
    } finally {
      setBusy(null);
    }
  };

  const toggleModel = (candidate: GatewayModelCandidate) => {
    setSelected(current => {
      const next = new Map(current);
      if (next.has(candidate.modelId)) {
        next.delete(candidate.modelId);
        return next;
      }
      if (next.size >= 8) {
        setError(zh ? "每条连接最多选择 8 个模型。" : "Select up to 8 models per connection.");
        return current;
      }
      const hasDefault = [...next.values()].some(item => item.family === candidate.family && item.isDefault);
      next.set(candidate.modelId, { ...candidate, isDefault: !hasDefault });
      return next;
    });
  };

  const changeFamily = (modelId: string, family: AISearchModelFamily) => {
    setSelected(current => {
      const next = new Map(current);
      const item = next.get(modelId);
      if (!item) return current;
      const hasDefault = [...next.values()].some(
        model => model.modelId !== modelId && model.family === family && model.isDefault,
      );
      next.set(modelId, { ...item, family, isDefault: !hasDefault });
      return next;
    });
  };

  const makeDefault = (modelId: string) => {
    setSelected(current => {
      const target = current.get(modelId);
      if (!target) return current;
      return new Map([...current].map(([id, model]) => [
        id,
        { ...model, isDefault: model.family === target.family ? id === modelId : model.isDefault },
      ]));
    });
  };

  const save = async () => {
    setBusy("save");
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/provider-connections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          baseUrl,
          protocol,
          apiKey,
          selectedModels: [...selected.values()].map(model => ({
            modelId: model.modelId,
            family: model.family,
            isDefault: model.isDefault,
          })),
          approvedPaidVerification: true,
        }),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "GATEWAY_SAVE_FAILED");
      setOpen(false);
      reset();
      await load();
    } catch (cause) {
      setError(gatewayError(cause instanceof Error ? cause.message.split(":")[0] : "", zh));
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setBusy("save");
    try {
      const response = await fetch(
        `/api/projects/${projectId}/provider-connections/${deleteTarget.id}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        const body = await response.json() as { error?: string };
        throw new Error(body.error ?? "GATEWAY_DELETE_FAILED");
      }
      setDeleteTarget(null);
      await load();
    } catch (cause) {
      setError(gatewayError(cause instanceof Error ? cause.message : "", zh));
    } finally {
      setBusy(null);
    }
  };

  const filteredModels = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? models.filter(model => model.modelId.toLowerCase().includes(term)) : models;
  }, [models, search]);
  const verifiedModelCount = connections.reduce((sum, connection) => sum + connection.models.length, 0);
  const failedCount = connections.filter(connection => connection.lastTestStatus === "FAILED").length;

  return (
    <section className="mt-6 space-y-4" aria-labelledby="gateway-connections-title">
      <div className="overflow-hidden rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-cyan-400/[0.09] via-slate-950 to-violet-400/[0.08]">
        <div className="grid gap-5 p-5 lg:grid-cols-[1fr_auto] lg:items-center lg:p-6">
          <div>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/25 bg-cyan-300/10 text-cyan-200">
              <Network className="h-5 w-5" />
            </div>
            <h2 id="gateway-connections-title" className="text-xl font-semibold text-white">
              {zh ? "第三方 AI 网关" : "Third-party AI gateways"}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              {zh
                ? "独立管理多个中转站、多个加密 Key 和多个模型。网关结果会明确标记为第三方 API，不冒充官方产品结果。"
                : "Manage multiple gateways, encrypted keys, and models. Gateway results remain clearly labeled as third-party API results."}
            </p>
          </div>
          <Button className="min-h-11 gap-2 px-5" onClick={() => { reset(); setOpen(true); }}>
            <Plus className="h-4 w-4" />
            {zh ? "添加中转站" : "Add gateway"}
          </Button>
        </div>
        <div className="grid border-t border-white/10 sm:grid-cols-3">
          {[
            [connections.length, zh ? "连接" : "Connections"],
            [verifiedModelCount, zh ? "已验证模型" : "Verified models"],
            [failedCount, zh ? "异常连接" : "Connections needing attention"],
          ].map(([value, label], index) => (
            <div key={String(label)} className={`px-5 py-4 ${index ? "border-t border-white/10 sm:border-l sm:border-t-0" : ""}`}>
              <p className="text-2xl font-semibold text-white">{loading ? "—" : value}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-400">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-28 items-center justify-center rounded-2xl border border-white/10">
          <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />
        </div>
      ) : connections.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {connections.map(connection => (
            <Card key={connection.id} className="overflow-hidden border-white/10 bg-slate-950/55">
              <CardContent className="p-0">
                <div className="flex items-start gap-4 border-b border-white/10 p-5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-400/10 text-violet-200">
                    <Server className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-semibold text-white">{connection.name}</h3>
                      <Badge variant="outline" className="border-emerald-400/25 text-emerald-200">
                        {zh ? "可用" : "Ready"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-400">
                      {zh
                        ? `${connection.models.length} 个模型已验证，可以开始检测`
                        : `${connection.models.length} verified models, ready for checks`}
                    </p>
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex flex-wrap gap-2">
                    {connection.models.map(model => (
                      <span key={model.id} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                        {model.displayName}
                        {model.isDefault ? <span className="text-cyan-200">{zh ? "默认" : "Default"}</span> : null}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 space-y-3">
                    <TechnicalDetails
                      label={zh ? "查看连接技术信息" : "View connection details"}
                      className="min-w-0"
                    >
                      <dl className="grid gap-3 text-sm sm:grid-cols-3">
                        <div>
                          <dt className="text-slate-500">{zh ? "服务地址" : "Service host"}</dt>
                          <dd className="mt-1 break-all text-slate-200">{connection.baseUrlHost}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-500">{zh ? "兼容协议" : "Protocol"}</dt>
                          <dd className="mt-1 text-slate-200">{PROTOCOL_LABELS[connection.protocol]}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-500">{zh ? "加密凭据" : "Encrypted credential"}</dt>
                          <dd className="mt-1 font-mono text-slate-200">{connection.keyMask}</dd>
                        </div>
                      </dl>
                    </TechnicalDetails>
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                      <Button asChild className="min-h-11 justify-between">
                        <a href="#saved-questions">
                          {zh ? "使用这个连接开始检测" : "Run a check with this connection"}
                          <ChevronRight className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button variant="ghost" className="min-h-11 gap-2 text-muted-foreground" onClick={() => setDeleteTarget(connection)}>
                        <Trash2 className="h-4 w-4" />
                        {zh ? "删除这个中转站" : "Delete this gateway"}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.025] p-8 text-center">
          <Layers3 className="mx-auto h-7 w-7 text-slate-500" />
          <p className="mt-4 font-medium text-white">{zh ? "还没有第三方网关" : "No third-party gateways yet"}</p>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-400">
            {zh ? "添加第一条连接后，可以用同一个 Key 选择多个模型，也可以继续添加其他 Key。" : "One key can power multiple models, and you can add more connections whenever needed."}
          </p>
        </div>
      )}

      <Dialog open={open} onOpenChange={value => { if (!busy) { setOpen(value); if (!value) reset(); } }}>
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto p-0">
          <div className="border-b border-white/10 px-5 py-5 pr-16 sm:px-7">
            <DialogTitle className="text-xl text-white">{zh ? "添加第三方 AI 网关" : "Add an AI gateway"}</DialogTitle>
            <DialogDescription className="mt-2 text-sm leading-6 text-slate-400">
              {zh ? "密钥只会在服务端加密保存。读取模型不产生模型调用费用；最终验证会对每个所选模型发送一次最小请求。" : "Keys are encrypted server-side. Model discovery is free; final verification sends one minimal request per selected model."}
            </DialogDescription>
          </div>

          <div className="grid gap-0 lg:grid-cols-[240px_1fr]">
            <aside className="border-b border-white/10 bg-white/[0.025] p-5 lg:border-b-0 lg:border-r">
              <ol className="grid grid-cols-3 gap-2 lg:grid-cols-1">
                {[
                  { Icon: Server, label: zh ? "连接信息" : "Connection" },
                  { Icon: Search, label: zh ? "读取模型" : "Discover" },
                  { Icon: ShieldCheck, label: zh ? "验证并保存" : "Verify" },
                ].map(({ Icon, label }, index) => (
                  <li key={String(label)} className="flex min-h-11 items-center gap-3 rounded-xl border border-white/10 px-3 text-xs text-slate-300">
                    <Icon className="h-4 w-4 shrink-0 text-cyan-300" />
                    <span>{index + 1}. {label}</span>
                  </li>
                ))}
              </ol>
            </aside>

            <div className="space-y-6 p-5 sm:p-7">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="gateway-name">{zh ? "服务名称" : "Service name"}</Label>
                  <Input id="gateway-name" className="min-h-11" value={name} onChange={event => { setName(event.target.value); setModels([]); }} placeholder={zh ? "例如：公司 AI 网关" : "e.g. Company AI Gateway"} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="gateway-url">{zh ? "API 地址" : "Base URL"}</Label>
                  <Input id="gateway-url" className="min-h-11" value={baseUrl} onChange={event => { setBaseUrl(event.target.value); setModels([]); }} placeholder="https://gateway.example.com" />
                  <p className="text-xs text-slate-500">{zh ? "可填写根地址或包含 /v1、/v1beta 的地址。" : "Root URLs and /v1 or /v1beta URLs are supported."}</p>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="gateway-key">API Key</Label>
                  <Input id="gateway-key" type="password" autoComplete="new-password" className="min-h-11 font-mono" value={apiKey} onChange={event => { setApiKey(event.target.value); setModels([]); }} placeholder={zh ? "粘贴中转站提供的 Key" : "Paste the gateway key"} />
                </div>
              </div>
              <TechnicalDetails label={zh ? "高级连接设置" : "Advanced connection settings"}>
                <div className="space-y-2">
                  <Label htmlFor="gateway-protocol">{zh ? "兼容协议" : "Protocol"}</Label>
                  <Select id="gateway-protocol" className="min-h-11" value={protocol} onChange={event => { setProtocol(event.target.value as AISearchGatewayProtocol); setModels([]); }}>
                    {AI_SEARCH_GATEWAY_PROTOCOLS.map(value => <option key={value} value={value}>{PROTOCOL_LABELS[value]}</option>)}
                  </Select>
                  <p className="text-xs leading-5 text-slate-500">
                    {zh ? "默认使用 OpenAI 兼容协议。只有服务商明确要求时才需要修改。" : "OpenAI-compatible is the default. Change it only when your provider explicitly requires another protocol."}
                  </p>
                </div>
              </TechnicalDetails>

              {!models.length ? (
                <Button className="min-h-11 w-full gap-2" disabled={busy !== null || !name.trim() || !baseUrl.trim() || apiKey.trim().length < 8} onClick={() => void discover()}>
                  {busy === "discover" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  {zh ? "测试连接并读取模型" : "Test and discover models"}
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-medium text-white">{zh ? `选择模型（已选 ${selected.size}/8）` : `Choose models (${selected.size}/8)`}</h3>
                      <p className="mt-1 text-xs text-slate-500">{zh ? "同一个 Key 可以绑定多个模型。" : "One key can be bound to multiple models."}</p>
                    </div>
                    <div className="relative sm:w-64">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <Input className="min-h-11 pl-9" value={search} onChange={event => setSearch(event.target.value)} placeholder={zh ? "搜索模型" : "Search models"} />
                    </div>
                  </div>
                  <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                    {filteredModels.map(candidate => {
                      const active = selected.get(candidate.modelId);
                      return (
                        <div key={candidate.modelId} className={`rounded-2xl border p-3 transition-colors ${active ? "border-cyan-300/40 bg-cyan-300/[0.07]" : "border-white/10 bg-white/[0.02]"}`}>
                          <div className="flex items-center gap-3">
                            <button type="button" className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${active ? "border-cyan-300 bg-cyan-300 text-slate-950" : "border-white/15 text-transparent"}`} aria-label={active ? (zh ? "取消选择模型" : "Unselect model") : (zh ? "选择模型" : "Select model")} onClick={() => toggleModel(candidate)}>
                              <Check className="h-4 w-4" />
                            </button>
                            <button type="button" className="min-h-11 min-w-0 flex-1 text-left" onClick={() => toggleModel(candidate)}>
                              <span className="block truncate text-sm font-medium text-white">{candidate.displayName}</span>
                            </button>
                          </div>
                          <TechnicalDetails
                            label={zh ? "查看模型标识" : "View model identifier"}
                            className="mt-2"
                          >
                            <p className="break-all font-mono text-xs text-slate-400">{candidate.modelId}</p>
                          </TechnicalDetails>
                          {active ? (
                            <div className="mt-3 grid gap-2 border-t border-white/10 pt-3 sm:grid-cols-[1fr_auto]">
                              <Select className="min-h-11" value={active.family} onChange={event => changeFamily(candidate.modelId, event.target.value as AISearchModelFamily)}>
                                {AI_SEARCH_MODEL_FAMILIES.map(family => <option key={family} value={family}>{FAMILY_LABELS[family]}</option>)}
                              </Select>
                              <Button type="button" variant={active.isDefault ? "default" : "outline"} className="min-h-11" onClick={() => makeDefault(candidate.modelId)}>
                                {active.isDefault ? (zh ? "此类默认" : "Default") : (zh ? "设为默认" : "Make default")}
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>

                  <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.07] p-4 text-sm leading-6 text-amber-100">
                    {zh ? `保存前将对 ${selected.size} 个模型分别发送一次最小验证请求，可能产生极少量费用。任一模型失败都会停止保存并显示原因。` : `Saving sends one minimal verification request to each of the ${selected.size} selected models. Any failure stops the save and is reported.`}
                  </div>
                  <Button className="min-h-11 w-full gap-2" disabled={busy !== null || selected.size === 0} onClick={() => void save()}>
                    {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                    {zh ? `验证 ${selected.size} 个模型并保存` : `Verify ${selected.size} models and save`}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {error ? <div role="alert" className="rounded-2xl border border-red-400/25 bg-red-400/[0.08] p-4 text-sm leading-6 text-red-100">{error}</div> : null}
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <KeyRound className="h-4 w-4" />
                {zh ? "API Key 不会返回浏览器，也不会出现在日志中。" : "API keys are never returned to the browser or written to logs."}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={value => { if (!value && !busy) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogTitle>{zh ? "删除网关连接？" : "Delete gateway connection?"}</DialogTitle>
          <DialogDescription className="mt-2 leading-6">
            {zh ? `将删除“${deleteTarget?.name ?? ""}”及其模型绑定。历史检测结果不会被删除。` : `This removes “${deleteTarget?.name ?? ""}” and its model bindings. Historical results remain intact.`}
          </DialogDescription>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <DialogClose asChild><Button variant="outline" className="min-h-11">{zh ? "取消" : "Cancel"}</Button></DialogClose>
            <Button variant="destructive" className="min-h-11 gap-2" disabled={busy !== null} onClick={() => void remove()}>
              <Trash2 className="h-4 w-4" />
              {zh ? "确认删除" : "Delete connection"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

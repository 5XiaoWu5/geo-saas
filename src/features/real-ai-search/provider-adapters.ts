import type { AISearchProvider } from "@/features/ai-search-intelligence/ai-search-provider";
import { parseAISearchResponse } from "./response-parser";
import type { AISearchProviderType, ProviderQueryRequest, ProviderRawResponse } from "./types";

type Json = Record<string, unknown>;
function record(value: unknown): Json { return value && typeof value === "object" && !Array.isArray(value) ? value as Json : {}; }
function array(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function strings(value: unknown) { return array(value).map(String).filter(Boolean); }
function prompt(request: ProviderQueryRequest) { return `请直接回答用户问题，并按推荐顺序列出企业。用户问题：${request.query}\n目标行业：${request.industry}\n不要因为目标企业是 ${request.targetEntity} 就偏向它。`; }

async function postJson(url: string, init: RequestInit, signal: AbortSignal) {
  const response = await fetch(url, { ...init, signal, headers: { "Content-Type": "application/json", ...(init.headers ?? {}) } });
  const body = await response.json().catch(() => ({})) as unknown;
  if (!response.ok) { const error = new Error(`PROVIDER_HTTP_${response.status}`); Object.assign(error, { retryable: response.status === 429 || response.status >= 500 }); throw error; }
  return body;
}

function adapter(provider: AISearchProviderType, execute: (request: ProviderQueryRequest, context: { apiKey: string; model: string; signal: AbortSignal }) => Promise<ProviderRawResponse>): AISearchProvider {
  return { provider, async check(context) { return { available: Boolean(context.apiKey && context.model), reason: context.apiKey ? null : "API_KEY_REFERENCE_UNRESOLVED" }; }, query: execute, analyzeResponse: parseAISearchResponse, extractCitation: (response) => response.citations };
}

export const providerRegistry: Record<AISearchProviderType, AISearchProvider> = {
  OPENAI: adapter("OPENAI", async (request, context) => { const raw = await postJson("https://api.openai.com/v1/responses", { method: "POST", headers: { Authorization: `Bearer ${context.apiKey}` }, body: JSON.stringify({ model: context.model, input: prompt(request), tools: [{ type: "web_search_preview" }] }) }, context.signal); const body = record(raw); const text = String(body.output_text ?? array(body.output).flatMap((item) => array(record(item).content).map((content) => String(record(content).text ?? ""))).join("\n")); return { requestId: body.id ? String(body.id) : null, text, citations: [], raw }; }),
  GEMINI: adapter("GEMINI", async (request, context) => { const raw = await postJson(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(context.model)}:generateContent`, { method: "POST", headers: { "x-goog-api-key": context.apiKey }, body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt(request) }] }] }) }, context.signal); const body = record(raw); const candidates = array(body.candidates); const first = record(candidates[0]); const text = array(record(first.content).parts).map((part) => String(record(part).text ?? "")).join("\n"); const chunks = array(record(first.groundingMetadata).groundingChunks); const citations = chunks.flatMap((chunk) => { const uri = record(record(chunk).web).uri; return uri ? [String(uri)] : []; }); return { requestId: body.responseId ? String(body.responseId) : null, text, citations, raw }; }),
  CLAUDE: adapter("CLAUDE", async (request, context) => { const raw = await postJson("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-api-key": context.apiKey, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model: context.model, max_tokens: 2048, messages: [{ role: "user", content: prompt(request) }] }) }, context.signal); const body = record(raw); const text = array(body.content).map((item) => String(record(item).text ?? "")).join("\n"); return { requestId: body.id ? String(body.id) : null, text, citations: [], raw }; }),
  PERPLEXITY: adapter("PERPLEXITY", async (request, context) => { const raw = await postJson("https://api.perplexity.ai/v1/sonar", { method: "POST", headers: { Authorization: `Bearer ${context.apiKey}` }, body: JSON.stringify({ model: context.model, messages: [{ role: "user", content: prompt(request) }] }) }, context.signal); const body = record(raw); const choice = record(array(body.choices)[0]); const text = String(record(choice.message).content ?? ""); const searchUrls = array(body.search_results).flatMap((item) => { const url = record(item).url; return url ? [String(url)] : []; }); return { requestId: body.id ? String(body.id) : null, text, citations: [...strings(body.citations), ...searchUrls], raw }; }),
};

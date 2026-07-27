import type { AISearchProvider } from "@/features/ai-search-intelligence/ai-search-provider";
import { safeCompatibleJsonRequest } from "./compatible-provider-security";
import { parseAISearchResponse } from "./response-parser";
import { classifyProviderHttpError, normalizeProviderRuntimeError } from "./provider-errors";
import type {
  AISearchProviderType,
  ProviderConnectionContext,
  ProviderModelOption,
  ProviderQueryRequest,
  ProviderRawResponse,
} from "./types";

type Json = Record<string, unknown>;
type ModelContext = Omit<ProviderConnectionContext, "model">;

function record(value: unknown): Json {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Json : {};
}
function array(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function strings(value: unknown) { return array(value).map(String).filter(Boolean); }
function prompt(request: ProviderQueryRequest) {
  return `请直接回答用户问题，并按推荐顺序列出企业。用户问题：${request.query}\n目标行业：${request.industry}\n不要因为目标企业是 ${request.targetEntity} 就偏向它。`;
}
function verificationPrompt() { return "Reply with only OK."; }

async function readJson(response: Response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("PROVIDER_INVALID_RESPONSE");
  }
}

async function requestJson(url: string, init: RequestInit, signal: AbortSignal) {
  try {
    const response = await fetch(url, {
      ...init,
      redirect: "error",
      signal,
      headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
    });
    const body = await readJson(response);
    if (!response.ok) {
      const error = new Error(classifyProviderHttpError(response.status, body));
      Object.assign(error, { retryable: response.status === 429 || response.status >= 500 });
      throw error;
    }
    return body;
  } catch (error) {
    if (error instanceof Error && /^[A-Z][A-Z0-9_]+$/.test(error.message)) throw error;
    throw new Error(normalizeProviderRuntimeError(error));
  }
}

function modelOption(
  provider: AISearchProviderType,
  modelId: string,
  displayName = modelId,
): ProviderModelOption {
  return {
    modelId,
    displayName,
    provider,
    availability: "LISTED_NOT_TESTED",
    capabilities: {},
    lastVerifiedAt: null,
  };
}

function compatibleRoot(baseUrl: string) {
  return baseUrl.endsWith("/v1") ? baseUrl : `${baseUrl}/v1`;
}

function openAIText(body: Json) {
  const direct = typeof body.output_text === "string" ? body.output_text : "";
  if (direct) return direct;
  return array(body.output)
    .flatMap(item => array(record(item).content))
    .map(content => String(record(content).text ?? ""))
    .filter(Boolean)
    .join("\n");
}

function openAICitations(body: Json) {
  return array(body.output)
    .flatMap(item => array(record(item).content))
    .flatMap(content => array(record(content).annotations))
    .flatMap(annotation => {
      const value = record(annotation);
      return value.type === "url_citation" && typeof value.url === "string" ? [value.url] : [];
    });
}

function adapter(
  provider: AISearchProviderType,
  listModels: (context: ModelContext) => Promise<ProviderModelOption[]>,
  execute: (request: ProviderQueryRequest, context: ProviderConnectionContext) => Promise<ProviderRawResponse>,
): AISearchProvider {
  return {
    provider,
    async check(context) {
      return {
        available: Boolean(context.apiKey && context.model),
        reason: context.apiKey ? null : "API_KEY_REFERENCE_UNRESOLVED",
      };
    },
    listModels,
    query: execute,
    analyzeResponse: parseAISearchResponse,
    extractCitation: response => response.citations,
  };
}

export const providerRegistry: Record<AISearchProviderType, AISearchProvider> = {
  OPENAI: adapter(
    "OPENAI",
    async context => {
      const compatible = context.connectionType === "OPENAI_COMPATIBLE";
      const root = compatible ? compatibleRoot(String(context.baseUrl)) : "https://api.openai.com/v1";
      const raw = compatible
        ? await safeCompatibleJsonRequest(`${root}/models`, {
          method: "GET",
          headers: { Authorization: `Bearer ${context.apiKey}` },
        }, { signal: context.signal })
        : await requestJson(`${root}/models`, {
          method: "GET",
          headers: { Authorization: `Bearer ${context.apiKey}` },
        }, context.signal);
      const models = array(record(raw).data)
        .map(item => String(record(item).id ?? ""))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));
      return models.map(model => modelOption("OPENAI", model));
    },
    async (request, context) => {
      if (context.connectionType === "OPENAI_COMPATIBLE") {
        const raw = await safeCompatibleJsonRequest(`${compatibleRoot(String(context.baseUrl))}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${context.apiKey}`,
          },
          body: JSON.stringify({
            model: context.model,
            max_tokens: context.verificationOnly ? 8 : 2048,
            messages: [{ role: "user", content: context.verificationOnly ? verificationPrompt() : prompt(request) }],
          }),
        }, { signal: context.signal });
        const body = record(raw);
        const choice = record(array(body.choices)[0]);
        const text = String(record(choice.message).content ?? "");
        return { requestId: body.id ? String(body.id) : null, text, citations: [], raw };
      }
      const raw = await requestJson("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { Authorization: `Bearer ${context.apiKey}` },
        body: JSON.stringify({
          model: context.model,
          input: context.verificationOnly ? verificationPrompt() : prompt(request),
          max_output_tokens: context.verificationOnly ? 8 : 2048,
          ...(context.verificationOnly ? {} : { tools: [{ type: "web_search_preview" }] }),
        }),
      }, context.signal);
      const body = record(raw);
      return {
        requestId: body.id ? String(body.id) : null,
        text: openAIText(body),
        citations: openAICitations(body),
        raw,
      };
    },
  ),
  GEMINI: adapter(
    "GEMINI",
    async context => {
      const raw = await requestJson("https://generativelanguage.googleapis.com/v1beta/models", {
        method: "GET",
        headers: { "x-goog-api-key": context.apiKey },
      }, context.signal);
      return array(record(raw).models)
        .filter(item => array(record(item).supportedGenerationMethods).includes("generateContent"))
        .map(item => {
          const value = record(item);
          const modelId = String(value.name ?? "").replace(/^models\//, "");
          return modelOption("GEMINI", modelId, String(value.displayName ?? modelId));
        })
        .filter(item => item.modelId);
    },
    async (request, context) => {
      const raw = await requestJson(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(context.model)}:generateContent`, {
        method: "POST",
        headers: { "x-goog-api-key": context.apiKey },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [{ text: context.verificationOnly ? verificationPrompt() : prompt(request) }],
          }],
          generationConfig: { maxOutputTokens: context.verificationOnly ? 8 : 2048 },
        }),
      }, context.signal);
      const body = record(raw);
      const first = record(array(body.candidates)[0]);
      const text = array(record(first.content).parts).map(part => String(record(part).text ?? "")).join("\n");
      const chunks = array(record(first.groundingMetadata).groundingChunks);
      const citations = chunks.flatMap(chunk => {
        const uri = record(record(chunk).web).uri;
        return uri ? [String(uri)] : [];
      });
      return { requestId: body.responseId ? String(body.responseId) : null, text, citations, raw };
    },
  ),
  CLAUDE: adapter(
    "CLAUDE",
    async () => [
      modelOption("CLAUDE", "claude-sonnet-4-20250514", "Claude Sonnet 4"),
    ],
    async (request, context) => {
      const raw = await requestJson("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": context.apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: context.model,
          max_tokens: context.verificationOnly ? 8 : 2048,
          messages: [{ role: "user", content: context.verificationOnly ? verificationPrompt() : prompt(request) }],
        }),
      }, context.signal);
      const body = record(raw);
      const text = array(body.content).map(item => String(record(item).text ?? "")).join("\n");
      return { requestId: body.id ? String(body.id) : null, text, citations: [], raw };
    },
  ),
  PERPLEXITY: adapter(
    "PERPLEXITY",
    async () => [
      modelOption("PERPLEXITY", "sonar", "Sonar"),
      modelOption("PERPLEXITY", "sonar-pro", "Sonar Pro"),
    ],
    async (request, context) => {
      const raw = await requestJson("https://api.perplexity.ai/v1/sonar", {
        method: "POST",
        headers: { Authorization: `Bearer ${context.apiKey}` },
        body: JSON.stringify({
          model: context.model,
          max_tokens: context.verificationOnly ? 8 : 2048,
          messages: [{ role: "user", content: context.verificationOnly ? verificationPrompt() : prompt(request) }],
        }),
      }, context.signal);
      const body = record(raw);
      const choice = record(array(body.choices)[0]);
      const text = String(record(choice.message).content ?? "");
      const searchUrls = array(body.search_results).flatMap(item => {
        const url = record(item).url;
        return url ? [String(url)] : [];
      });
      return {
        requestId: body.id ? String(body.id) : null,
        text,
        citations: [...strings(body.citations), ...searchUrls],
        raw,
      };
    },
  ),
};

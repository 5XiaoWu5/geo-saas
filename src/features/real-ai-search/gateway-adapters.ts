import { safeCompatibleJsonRequest } from "./compatible-provider-security";
import {
  inferModelFamily,
  type AISearchGatewayProtocol,
  type GatewayModelCandidate,
} from "./gateway-types";

type Json = Record<string, unknown>;
type GatewayRequest = {
  protocol: AISearchGatewayProtocol;
  baseUrl: string;
  apiKey: string;
  signal: AbortSignal;
};

function record(value: unknown): Json {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Json : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function root(baseUrl: string, suffix: "v1" | "v1beta") {
  if (baseUrl.endsWith(`/${suffix}`)) return baseUrl;
  if (/\/v1(?:beta)?$/.test(baseUrl)) return baseUrl.replace(/\/v1(?:beta)?$/, `/${suffix}`);
  return `${baseUrl}/${suffix}`;
}

function modelCandidates(ids: string[]) {
  return [...new Set(ids.filter(Boolean))]
    .sort((a, b) => a.localeCompare(b))
    .map<GatewayModelCandidate>(modelId => ({
      modelId,
      displayName: modelId.replace(/^models\//, ""),
      family: inferModelFamily(modelId),
    }));
}

export async function discoverGatewayModels(input: GatewayRequest) {
  if (input.protocol === "GEMINI_COMPATIBLE") {
    const raw = await safeCompatibleJsonRequest(`${root(input.baseUrl, "v1beta")}/models`, {
      method: "GET",
      headers: { "x-goog-api-key": input.apiKey },
    }, { signal: input.signal });
    return modelCandidates(array(record(raw).models).map(item => String(record(item).name ?? "").replace(/^models\//, "")));
  }

  const headers: Record<string, string> = input.protocol === "ANTHROPIC_COMPATIBLE"
    ? { "x-api-key": input.apiKey, "anthropic-version": "2023-06-01" }
    : { Authorization: `Bearer ${input.apiKey}` };
  const raw = await safeCompatibleJsonRequest(`${root(input.baseUrl, "v1")}/models`, {
    method: "GET",
    headers,
  }, { signal: input.signal });
  return modelCandidates(array(record(raw).data).map(item => String(record(item).id ?? "")));
}

export async function verifyGatewayModel(input: GatewayRequest & { modelId: string }) {
  if (input.protocol === "ANTHROPIC_COMPATIBLE") {
    const raw = await safeCompatibleJsonRequest(`${root(input.baseUrl, "v1")}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": input.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: input.modelId,
        max_tokens: 8,
        messages: [{ role: "user", content: "Reply with only OK." }],
      }),
    }, { signal: input.signal });
    const text = array(record(raw).content).map(item => String(record(item).text ?? "")).join("\n").trim();
    if (!text) throw new Error("PROVIDER_EMPTY_RESPONSE");
    return { requestId: record(raw).id ? String(record(raw).id) : null, text };
  }

  if (input.protocol === "GEMINI_COMPATIBLE") {
    const modelId = input.modelId.replace(/^models\//, "");
    const raw = await safeCompatibleJsonRequest(
      `${root(input.baseUrl, "v1beta")}/models/${encodeURIComponent(modelId)}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": input.apiKey },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: "Reply with only OK." }] }],
          generationConfig: { maxOutputTokens: 8 },
        }),
      },
      { signal: input.signal },
    );
    const text = array(record(array(record(raw).candidates)[0]).content)
      .concat(array(record(record(array(record(raw).candidates)[0]).content).parts))
      .map(item => String(record(item).text ?? ""))
      .join("\n")
      .trim();
    if (!text) throw new Error("PROVIDER_EMPTY_RESPONSE");
    return { requestId: record(raw).responseId ? String(record(raw).responseId) : null, text };
  }

  const raw = await safeCompatibleJsonRequest(`${root(input.baseUrl, "v1")}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${input.apiKey}` },
    body: JSON.stringify({
      model: input.modelId,
      max_tokens: 8,
      messages: [{ role: "user", content: "Reply with only OK." }],
    }),
  }, { signal: input.signal });
  const text = String(record(record(array(record(raw).choices)[0]).message).content ?? "").trim();
  if (!text) throw new Error("PROVIDER_EMPTY_RESPONSE");
  return { requestId: record(raw).id ? String(record(raw).id) : null, text };
}

import { recordMonitoringFailure, recordMonitoringSuccess } from "@/features/monitoring-automation";
import { safeErrorCode } from "@/lib/server/redact-sensitive";
import { assertSafeCompatibleBaseUrl, normalizeCompatibleBaseUrl } from "./compatible-provider-security";
import { jsonArray } from "./database";
import { providerRegistry } from "./provider-adapters";
import { normalizeProviderRuntimeError } from "./provider-errors";
import { decryptProviderApiKey, encryptProviderApiKey } from "./provider-secret";
import { aiSearchQueryRepository } from "./query-repository";
import {
  issueProviderVerificationToken,
  providerCredentialFingerprint,
  verifyProviderVerificationToken,
} from "./provider-verification-token";
import { realAISearchRepository } from "./repository";
import type {
  AIModelVerificationStatus,
  AISearchConnectionType,
  AISearchDetectionSource,
  AISearchIntent,
  AISearchProviderType,
  ProviderCapabilities,
  ProviderCompatibilityLevel,
} from "./types";

export class RealAISearchError extends Error {
  constructor(public code: string, public status: number) { super(code); }
}

const rateWindows = new Map<string, number[]>();
const TIMEOUT_MS = 20_000;
const MAX_ATTEMPTS = 2;

type DirectProviderInput = {
  apiKey?: string;
  connectionType?: AISearchConnectionType;
  baseUrl?: string | null;
  displayName?: string | null;
};

function enforceRateLimit(key: string) {
  const now = Date.now();
  const recent = (rateWindows.get(key) ?? []).filter(time => now - time < 60_000);
  if (recent.length >= 10) throw new RealAISearchError("AI_SEARCH_RATE_LIMITED", 429);
  recent.push(now);
  rateWindows.set(key, recent);
}

async function resolveApiKey(config: Record<string, unknown>, projectId: string, provider: AISearchProviderType) {
  const encrypted = await decryptProviderApiKey(config, projectId, provider);
  if (encrypted) return encrypted;
  const reference = config.apiKeyReference;
  if (typeof reference !== "string" || !/^env:[A-Z][A-Z0-9_]{1,127}$/.test(reference)) return null;
  return process.env[reference.slice(4)]?.trim() || null;
}

function errorCode(error: unknown) {
  return safeErrorCode(
    error instanceof Error ? new Error(error.message.replace(/:/g, "_")) : error,
    "PROVIDER_REQUEST_FAILED",
  );
}

function retryable(error: unknown) {
  return Boolean(error && typeof error === "object" && "retryable" in error && (error as { retryable?: boolean }).retryable);
}

function normalizedConnectionType(provider: AISearchProviderType, value: unknown): AISearchConnectionType {
  if (provider !== "OPENAI") return "NATIVE";
  return value === "OPENAI_COMPATIBLE" ? "OPENAI_COMPATIBLE" : "OPENAI_OFFICIAL";
}

function detectionSource(connectionType: AISearchConnectionType): AISearchDetectionSource {
  return connectionType === "OPENAI_COMPATIBLE" ? "COMPATIBLE_GATEWAY" : "OFFICIAL_API";
}

export function modelVerificationStatusForError(code: string): AIModelVerificationStatus {
  if (code === "API_KEY_PERMISSION_DENIED") return "NO_ACCESS";
  if (code === "MODEL_NOT_FOUND") return "MODEL_NOT_FOUND";
  if (code === "ACCOUNT_BALANCE_INSUFFICIENT") return "INSUFFICIENT_BALANCE";
  if (code === "PROVIDER_RATE_LIMITED") return "RATE_LIMITED";
  if (code === "PROVIDER_UNAVAILABLE" || code === "PROVIDER_TIMEOUT") return "TEMPORARILY_UNAVAILABLE";
  if (code === "MODEL_UNSUPPORTED") return "UNSUPPORTED";
  return "VERIFICATION_FAILED";
}

function verifiedCapabilities(hasStructuredCitations: boolean): ProviderCapabilities {
  return {
    textGeneration: "SUPPORTED",
    structuredOutput: "NOT_TESTED",
    streaming: "NOT_TESTED",
    toolCalling: "NOT_TESTED",
    webSearch: "NOT_TESTED",
    citationSources: hasStructuredCitations ? "SUPPORTED" : "NOT_TESTED",
  };
}

async function resolveProviderInput(
  userId: string,
  projectId: string,
  provider: AISearchProviderType,
  direct: DirectProviderInput = {},
) {
  const project = await realAISearchRepository.projectForUser(userId, projectId);
  if (!project) throw new RealAISearchError("PROJECT_FORBIDDEN", 403);
  const config = await realAISearchRepository.internalConfig(userId, projectId, provider);
  let apiKey = direct.apiKey?.trim() || null;
  if (!apiKey && config) {
    try {
      apiKey = await resolveApiKey(config, projectId, provider);
    } catch (error) {
      throw new RealAISearchError(normalizeProviderRuntimeError(error), 503);
    }
  }
  if (!apiKey) throw new RealAISearchError("API_KEY_REFERENCE_UNRESOLVED", 422);

  const connectionType = normalizedConnectionType(provider, direct.connectionType ?? config?.connectionType);
  let baseUrl: string | null = null;
  if (connectionType === "OPENAI_COMPATIBLE") {
    const supplied = direct.baseUrl ?? (typeof config?.baseUrl === "string" ? config.baseUrl : null);
    if (!supplied) throw new RealAISearchError("COMPATIBLE_BASE_URL_REQUIRED", 400);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      baseUrl = await assertSafeCompatibleBaseUrl(supplied, { signal: controller.signal });
    } catch (error) {
      const code = error instanceof Error && /^[A-Z][A-Z0-9_]+$/.test(error.message)
        ? error.message
        : normalizeProviderRuntimeError(error);
      throw new RealAISearchError(code, 400);
    } finally {
      clearTimeout(timer);
    }
  }
  return { project, config, apiKey, connectionType, baseUrl };
}

export async function getRealAISearchMonitoring(userId: string, projectId: string) {
  const [data, queries] = await Promise.all([
    realAISearchRepository.monitoring(userId, projectId),
    aiSearchQueryRepository.list(userId, projectId),
  ]);
  if (!data) throw new RealAISearchError("PROJECT_FORBIDDEN", 403);
  return { ...data, queries };
}

export async function listProviderModels(
  userId: string,
  projectId: string,
  provider: AISearchProviderType,
  direct: DirectProviderInput = {},
) {
  const input = await resolveProviderInput(userId, projectId, provider, direct);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const models = await providerRegistry[provider].listModels({
      apiKey: input.apiKey,
      connectionType: input.connectionType,
      baseUrl: input.baseUrl,
      signal: controller.signal,
    });
    return {
      provider,
      connectionType: input.connectionType,
      models,
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    const code = error instanceof Error && /^[A-Z][A-Z0-9_]+$/.test(error.message)
      ? error.message
      : normalizeProviderRuntimeError(error);
    throw new RealAISearchError(code, 422);
  } finally {
    clearTimeout(timer);
  }
}

export async function testProviderConnection(
  userId: string,
  projectId: string,
  provider: AISearchProviderType,
  direct: DirectProviderInput = {},
) {
  const result = await listProviderModels(userId, projectId, provider, direct);
  const config = await realAISearchRepository.internalConfig(userId, projectId, provider);
  if (config && !direct.apiKey && !direct.baseUrl && !direct.connectionType) {
    await realAISearchRepository.recordProviderTest(userId, projectId, provider, "SUCCEEDED", null);
  }
  return {
    provider,
    connectionType: result.connectionType,
    status: "SUCCEEDED" as const,
    modelCount: result.models.length,
    testedAt: result.fetchedAt,
  };
}

export async function verifyProviderModel(
  userId: string,
  projectId: string,
  provider: AISearchProviderType,
  modelId: string,
  direct: DirectProviderInput = {},
) {
  const input = await resolveProviderInput(userId, projectId, provider, direct);
  const listed = await listProviderModels(userId, projectId, provider, direct);
  if (!listed.models.some(model => model.modelId === modelId)) {
    throw new RealAISearchError("MODEL_NOT_FOUND", 422);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await providerRegistry[provider].query(
      {
        query: "Connection verification",
        intent: "TECHNICAL",
        targetEntity: String(input.project.targetEntity),
        industry: String(input.project.industry),
      },
      {
        apiKey: input.apiKey,
        model: modelId,
        connectionType: input.connectionType,
        baseUrl: input.baseUrl,
        signal: controller.signal,
        verificationOnly: true,
      },
    );
    if (!response.text.trim()) throw new Error("PROVIDER_EMPTY_RESPONSE");
    const verifiedAt = new Date().toISOString();
    const capabilities = verifiedCapabilities(response.citations.length > 0);
    const compatibilityLevel: ProviderCompatibilityLevel = "BASIC";
    const credentialFingerprint = await providerCredentialFingerprint(
      input.apiKey,
      input.connectionType,
      input.baseUrl,
    );
    const verificationToken = await issueProviderVerificationToken({
      projectId,
      provider,
      connectionType: input.connectionType,
      baseUrl: input.baseUrl,
      modelId,
      credentialFingerprint,
      capabilities,
      compatibilityLevel,
      verifiedAt,
    });
    return {
      provider,
      connectionType: input.connectionType,
      modelId,
      status: "VERIFIED_AVAILABLE" as const,
      compatibilityLevel,
      capabilities,
      requestId: response.requestId,
      verifiedAt,
      verificationToken,
    };
  } catch (error) {
    const code = error instanceof Error && /^[A-Z][A-Z0-9_]+$/.test(error.message)
      ? error.message
      : normalizeProviderRuntimeError(error);
    return {
      provider,
      connectionType: input.connectionType,
      modelId,
      status: modelVerificationStatusForError(code),
      compatibilityLevel: "UNAVAILABLE" as const,
      capabilities: null,
      requestId: null,
      verifiedAt: null,
      verificationToken: null,
      error: code,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function saveProviderConfig(userId: string, projectId: string, input: {
  provider: AISearchProviderType;
  connectionType: AISearchConnectionType;
  displayName: string | null;
  baseUrl: string | null;
  enabled: boolean;
  apiKeyReference: string | null;
  apiKey?: string;
  model: string;
  verificationToken: string;
}) {
  const resolved = await resolveProviderInput(userId, projectId, input.provider, input);
  let claims;
  try {
    claims = await verifyProviderVerificationToken(input.verificationToken);
  } catch (error) {
    throw new RealAISearchError(error instanceof Error ? error.message : "PROVIDER_VERIFICATION_TOKEN_INVALID", 422);
  }
  const normalizedBaseUrl = resolved.connectionType === "OPENAI_COMPATIBLE"
    ? normalizeCompatibleBaseUrl(String(resolved.baseUrl))
    : null;
  const fingerprint = await providerCredentialFingerprint(
    resolved.apiKey,
    resolved.connectionType,
    normalizedBaseUrl,
  );
  if (
    claims.projectId !== projectId
    || claims.provider !== input.provider
    || claims.connectionType !== resolved.connectionType
    || claims.baseUrl !== normalizedBaseUrl
    || claims.modelId !== input.model
    || claims.credentialFingerprint !== fingerprint
  ) {
    throw new RealAISearchError("PROVIDER_VERIFICATION_TOKEN_MISMATCH", 422);
  }

  let encryptedSecret = null;
  if (input.apiKey) {
    try {
      encryptedSecret = await encryptProviderApiKey(input.apiKey, projectId, input.provider);
    } catch (error) {
      console.error("[PROVIDER_SECRET_ENCRYPTION]", {
        provider: input.provider,
        name: error instanceof Error ? error.name : typeof error,
        code: error && typeof error === "object" && "code" in error ? String(error.code) : null,
      });
      throw new RealAISearchError(normalizeProviderRuntimeError(error), 503);
    }
  }
  const config = await realAISearchRepository.saveConfig(userId, projectId, {
    provider: input.provider,
    connectionType: resolved.connectionType,
    displayName: resolved.connectionType === "OPENAI_COMPATIBLE" ? input.displayName?.trim() || "Third-party AI service" : null,
    baseUrl: normalizedBaseUrl,
    enabled: input.enabled,
    apiKeyReference: input.apiKeyReference,
    encryptedSecret,
    model: input.model,
    capabilities: claims.capabilities,
    compatibilityLevel: claims.compatibilityLevel,
    modelVerifiedAt: new Date(claims.verifiedAt),
  });
  if (!config) throw new RealAISearchError("PROJECT_FORBIDDEN", 403);
  return config;
}

export async function removeProviderConfig(userId: string, projectId: string, provider: AISearchProviderType) {
  if (!await realAISearchRepository.projectForUser(userId, projectId)) {
    throw new RealAISearchError("PROJECT_FORBIDDEN", 403);
  }
  return { deleted: await realAISearchRepository.deleteConfig(userId, projectId, provider) };
}

export async function executeRealAISearch(
  userId: string,
  input: {
    projectId: string;
    provider: AISearchProviderType;
    queryId?: string;
    query?: string;
    intent: AISearchIntent;
  },
) {
  const project = await realAISearchRepository.projectForUser(userId, input.projectId);
  if (!project) throw new RealAISearchError("PROJECT_FORBIDDEN", 403);

  const queryRecord = input.queryId
    ? await aiSearchQueryRepository.owned(userId, input.projectId, input.queryId)
    : input.query
      ? await aiSearchQueryRepository.upsert(userId, input.projectId, {
          query: input.query,
          intent: input.intent,
        })
      : null;
  if (!queryRecord) throw new RealAISearchError("AI_SEARCH_QUERY_NOT_FOUND", 404);

  const config = await realAISearchRepository.internalConfig(userId, input.projectId, input.provider);
  const connectionType = normalizedConnectionType(input.provider, config?.connectionType);
  const source = detectionSource(connectionType);
  const pending = await aiSearchQueryRepository.createResult(userId, {
    projectId: input.projectId,
    queryId: String(queryRecord.id),
    provider: input.provider,
    detectionSource: source,
  });
  if (!pending) throw new RealAISearchError("PROJECT_FORBIDDEN", 403);
  const executionQuery = String(queryRecord.query);
  const executionIntent = String(queryRecord.intent) as AISearchIntent;
  const startedAt = new Date();
  const started = startedAt.getTime();
  let attempts = 0;
  const fail = async (code: string, status = 422) => {
    const endedAt = new Date();
    const durationMs = endedAt.getTime() - started;
    await realAISearchRepository.markFailed(userId, input.projectId, pending.resultId, code, durationMs, attempts);
    try {
      await recordMonitoringFailure(userId, {
        projectId: input.projectId,
        provider: input.provider,
        resultId: pending.resultId,
        startedAt,
        endedAt,
        durationMs,
        errorCode: code,
      });
    } catch (automationError) {
      console.error("[MONITORING AUTOMATION FAILURE]", automationError);
    }
    throw new RealAISearchError(code, status);
  };

  try {
    enforceRateLimit(`${userId}:${input.projectId}`);
  } catch {
    return fail("AI_SEARCH_RATE_LIMITED", 429);
  }
  if (!config || !config.enabled) return fail("PROVIDER_DISABLED");
  if (config.modelVerificationStatus !== "VERIFIED_AVAILABLE") {
    return fail("MODEL_VERIFICATION_REQUIRED");
  }

  let apiKey;
  try {
    apiKey = await resolveApiKey(config, input.projectId, input.provider);
  } catch (error) {
    return fail(normalizeProviderRuntimeError(error));
  }
  const provider = providerRegistry[input.provider];
  const model = String(config.selectedModelId ?? config.model ?? "");
  const health = await provider.check({ apiKey, model });
  if (!health.available || !apiKey) return fail(health.reason ?? "PROVIDER_UNAVAILABLE");
  const baseUrl = connectionType === "OPENAI_COMPATIBLE" ? String(config.baseUrl ?? "") : null;
  await realAISearchRepository.markRunning(userId, input.projectId, pending.resultId);
  let response;
  while (attempts < MAX_ATTEMPTS) {
    attempts += 1;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      response = await provider.query(
        {
          query: executionQuery,
          intent: executionIntent,
          targetEntity: String(project.targetEntity),
          industry: String(project.industry),
        },
        { apiKey, model, connectionType, baseUrl, signal: controller.signal },
      );
      clearTimeout(timer);
      break;
    } catch (error) {
      clearTimeout(timer);
      if (attempts >= MAX_ATTEMPTS || !retryable(error)) {
        return fail(error instanceof DOMException && error.name === "AbortError" ? "PROVIDER_TIMEOUT" : errorCode(error));
      }
      await new Promise(resolve => setTimeout(resolve, 500 * attempts));
    }
  }
  if (!response?.text.trim()) return fail("PROVIDER_EMPTY_RESPONSE");
  const parsed = provider.analyzeResponse(response, {
    targetEntity: String(project.targetEntity),
    officialDomain: String(project.domain).replace(/^https?:\/\//, "").split("/")[0],
    productNames: jsonArray(project.productNames).map(String),
    competitorNames: jsonArray(project.competitorNames).map(String),
  });
  await realAISearchRepository.markSucceeded(
    userId,
    input.projectId,
    pending.resultId,
    response,
    parsed,
    Date.now() - started,
    attempts,
  );
  await realAISearchRepository.syncVisibility(userId, input.projectId, {
    provider: input.provider,
    query: executionQuery,
    answer: response.text,
    parsed,
  });
  if (!parsed.mentioned) await realAISearchRepository.syncGapTask(userId, input.projectId, input.provider);
  const endedAt = new Date();
  try {
    await recordMonitoringSuccess(userId, {
      projectId: input.projectId,
      provider: input.provider,
      resultId: pending.resultId,
      startedAt,
      endedAt,
      durationMs: endedAt.getTime() - started,
    });
  } catch (automationError) {
    console.error("[MONITORING AUTOMATION SUCCESS]", automationError);
  }
  return getRealAISearchMonitoring(userId, input.projectId);
}

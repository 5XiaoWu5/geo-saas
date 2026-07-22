import { providerRegistry } from "./provider-adapters";
import { jsonArray } from "./database";
import { realAISearchRepository } from "./repository";
import type { AISearchIntent, AISearchProviderType } from "./types";
import { recordMonitoringFailure, recordMonitoringSuccess } from "@/features/monitoring-automation";

export class RealAISearchError extends Error { constructor(public code: string, public status: number) { super(code); } }
const rateWindows = new Map<string, number[]>();
const TIMEOUT_MS = 20_000;
const MAX_ATTEMPTS = 2;

function enforceRateLimit(key: string) { const now = Date.now(); const recent = (rateWindows.get(key) ?? []).filter((time) => now - time < 60_000); if (recent.length >= 10) throw new RealAISearchError("AI_SEARCH_RATE_LIMITED", 429); recent.push(now); rateWindows.set(key, recent); }
function resolveApiKey(reference: unknown) { if (typeof reference !== "string" || !/^env:[A-Z][A-Z0-9_]{1,127}$/.test(reference)) return null; return process.env[reference.slice(4)]?.trim() || null; }
function errorCode(error: unknown) { const value = error instanceof Error ? error.message : "PROVIDER_REQUEST_FAILED"; return /^[A-Z0-9_:-]{3,120}$/.test(value) ? value.replace(/:/g, "_") : "PROVIDER_REQUEST_FAILED"; }
function retryable(error: unknown) { return Boolean(error && typeof error === "object" && "retryable" in error && (error as { retryable?: boolean }).retryable); }

export async function getRealAISearchMonitoring(userId: string, projectId: string) { const data = await realAISearchRepository.monitoring(userId, projectId); if (!data) throw new RealAISearchError("PROJECT_FORBIDDEN", 403); return data; }
export async function saveProviderConfig(userId: string, projectId: string, input: { provider: AISearchProviderType; enabled: boolean; apiKeyReference: string | null; model: string }) { if (!await realAISearchRepository.projectForUser(userId, projectId)) throw new RealAISearchError("PROJECT_FORBIDDEN", 403); const config = await realAISearchRepository.saveConfig(userId, projectId, input); if (!config) throw new RealAISearchError("PROJECT_FORBIDDEN", 403); return config; }
export async function removeProviderConfig(userId: string, projectId: string, provider: AISearchProviderType) { if (!await realAISearchRepository.projectForUser(userId, projectId)) throw new RealAISearchError("PROJECT_FORBIDDEN", 403); return { deleted: await realAISearchRepository.deleteConfig(userId, projectId, provider) }; }

export async function executeRealAISearch(userId: string, input: { projectId: string; provider: AISearchProviderType; query: string; intent: AISearchIntent }) {
  enforceRateLimit(`${userId}:${input.projectId}`);
  const project = await realAISearchRepository.projectForUser(userId, input.projectId);
  if (!project) throw new RealAISearchError("PROJECT_FORBIDDEN", 403);
  const pending = await realAISearchRepository.createPending(userId, { ...input, targetEntity: String(project.targetEntity), industry: String(project.industry) });
  if (!pending) throw new RealAISearchError("PROJECT_FORBIDDEN", 403);
  const startedAt = new Date(); const started = startedAt.getTime(); let attempts = 0;
  const fail = async (code: string) => { const endedAt = new Date(); const durationMs = endedAt.getTime() - started; await realAISearchRepository.markFailed(userId, input.projectId, pending.resultId, code, durationMs, attempts); try { await recordMonitoringFailure(userId, { projectId: input.projectId, provider: input.provider, resultId: pending.resultId, startedAt, endedAt, durationMs, errorCode: code }); } catch (automationError) { console.error("[MONITORING AUTOMATION FAILURE]", automationError); } throw new RealAISearchError(code, 422); };
  const config = await realAISearchRepository.internalConfig(userId, input.projectId, input.provider);
  if (!config || !config.enabled) return fail("PROVIDER_DISABLED");
  const apiKey = resolveApiKey(config.apiKeyReference);
  const provider = providerRegistry[input.provider];
  const health = await provider.check({ apiKey, model: String(config.model) });
  if (!health.available || !apiKey) return fail(health.reason ?? "PROVIDER_UNAVAILABLE");
  await realAISearchRepository.markRunning(userId, input.projectId, pending.resultId);
  let response;
  while (attempts < MAX_ATTEMPTS) {
    attempts += 1; const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try { response = await provider.query({ query: input.query, intent: input.intent, targetEntity: String(project.targetEntity), industry: String(project.industry) }, { apiKey, model: String(config.model), signal: controller.signal }); clearTimeout(timer); break; }
    catch (error) { clearTimeout(timer); if (attempts >= MAX_ATTEMPTS || !retryable(error)) return fail(error instanceof DOMException && error.name === "AbortError" ? "PROVIDER_TIMEOUT" : errorCode(error)); await new Promise((resolve) => setTimeout(resolve, 500 * attempts)); }
  }
  if (!response) return fail("PROVIDER_EMPTY_RESPONSE");
  const parsed = provider.analyzeResponse(response, { targetEntity: String(project.targetEntity), officialDomain: String(project.domain).replace(/^https?:\/\//, "").split("/")[0], productNames: jsonArray(project.productNames).map(String), competitorNames: jsonArray(project.competitorNames).map(String) });
  await realAISearchRepository.markSucceeded(userId, input.projectId, pending.resultId, response, parsed, Date.now() - started, attempts);
  await realAISearchRepository.syncVisibility(userId, input.projectId, { provider: input.provider, query: input.query, answer: response.text, parsed });
  if (!parsed.mentioned) await realAISearchRepository.syncGapTask(userId, input.projectId, input.provider);
  const endedAt = new Date();
  try { await recordMonitoringSuccess(userId, { projectId: input.projectId, provider: input.provider, resultId: pending.resultId, startedAt, endedAt, durationMs: endedAt.getTime() - started }); } catch (automationError) { console.error("[MONITORING AUTOMATION SUCCESS]", automationError); }
  return getRealAISearchMonitoring(userId, input.projectId);
}

import { assertSafeCompatibleBaseUrl } from "./compatible-provider-security";
import { discoverGatewayModels, verifyGatewayModel } from "./gateway-adapters";
import { gatewayRepository } from "./gateway-repository";
import {
  AI_SEARCH_GATEWAY_PROTOCOLS,
  AI_SEARCH_MODEL_FAMILIES,
  type AISearchGatewayProtocol,
  type AISearchModelFamily,
} from "./gateway-types";
import {
  modelVerificationStatusForError,
  RealAISearchError,
} from "./ai-search-execution.service";
import { normalizeProviderRuntimeError } from "./provider-errors";
import { encryptProviderApiKey } from "./provider-secret";
import { realAISearchRepository } from "./repository";
import type { ProviderCapabilities } from "./types";

const TIMEOUT_MS = 25_000;
const MAX_MODELS_PER_CONNECTION = 8;

type SelectedGatewayModel = {
  modelId: string;
  family: AISearchModelFamily;
  isDefault: boolean;
};

function validatedProtocol(value: string): AISearchGatewayProtocol {
  if (!AI_SEARCH_GATEWAY_PROTOCOLS.includes(value as AISearchGatewayProtocol)) {
    throw new RealAISearchError("GATEWAY_PROTOCOL_UNSUPPORTED", 400);
  }
  return value as AISearchGatewayProtocol;
}

function verifiedCapabilities(): ProviderCapabilities {
  return {
    textGeneration: "SUPPORTED",
    structuredOutput: "NOT_TESTED",
    streaming: "NOT_TESTED",
    toolCalling: "NOT_TESTED",
    webSearch: "NOT_TESTED",
    citationSources: "NOT_TESTED",
  };
}

async function ownedProject(userId: string, projectId: string) {
  const project = await realAISearchRepository.projectForUser(userId, projectId);
  if (!project) throw new RealAISearchError("PROJECT_FORBIDDEN", 403);
  return project;
}

async function safeBaseUrl(input: string, signal: AbortSignal) {
  try {
    return await assertSafeCompatibleBaseUrl(input, { signal });
  } catch (error) {
    const code = error instanceof Error && /^[A-Z][A-Z0-9_]+$/.test(error.message)
      ? error.message
      : normalizeProviderRuntimeError(error);
    throw new RealAISearchError(code, 400);
  }
}

function safeRuntimeError(error: unknown) {
  const code = error instanceof Error && /^[A-Z][A-Z0-9_]+$/.test(error.message)
    ? error.message
    : normalizeProviderRuntimeError(error);
  return new RealAISearchError(code, 422);
}

export async function listGatewayConnections(userId: string, projectId: string) {
  await ownedProject(userId, projectId);
  return gatewayRepository.list(userId, projectId);
}

export async function discoverGatewayConnection(userId: string, projectId: string, input: {
  name: string;
  baseUrl: string;
  protocol: string;
  apiKey: string;
}) {
  await ownedProject(userId, projectId);
  const protocol = validatedProtocol(input.protocol);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const baseUrl = await safeBaseUrl(input.baseUrl, controller.signal);
    const models = await discoverGatewayModels({
      protocol,
      baseUrl,
      apiKey: input.apiKey.trim(),
      signal: controller.signal,
    });
    if (!models.length) throw new RealAISearchError("GATEWAY_MODELS_EMPTY", 422);
    return {
      name: input.name.trim(),
      baseUrlHost: new URL(baseUrl).host,
      protocol,
      models,
      discoveredAt: new Date().toISOString(),
    };
  } catch (error) {
    if (error instanceof RealAISearchError) throw error;
    throw safeRuntimeError(error);
  } finally {
    clearTimeout(timer);
  }
}

export async function createGatewayConnection(userId: string, projectId: string, input: {
  name: string;
  baseUrl: string;
  protocol: string;
  apiKey: string;
  selectedModels: SelectedGatewayModel[];
  approvedPaidVerification: true;
}) {
  await ownedProject(userId, projectId);
  const protocol = validatedProtocol(input.protocol);
  if (!input.selectedModels.length || input.selectedModels.length > MAX_MODELS_PER_CONNECTION) {
    throw new RealAISearchError("GATEWAY_MODEL_SELECTION_INVALID", 400);
  }
  if (input.selectedModels.some(model => !AI_SEARCH_MODEL_FAMILIES.includes(model.family))) {
    throw new RealAISearchError("GATEWAY_MODEL_FAMILY_INVALID", 400);
  }
  const defaults = new Set<string>();
  for (const model of input.selectedModels) {
    if (model.isDefault && defaults.has(model.family)) {
      throw new RealAISearchError("GATEWAY_DEFAULT_MODEL_DUPLICATE", 400);
    }
    if (model.isDefault) defaults.add(model.family);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const baseUrl = await safeBaseUrl(input.baseUrl, controller.signal);
    const listed = await discoverGatewayModels({
      protocol,
      baseUrl,
      apiKey: input.apiKey.trim(),
      signal: controller.signal,
    });
    const listedMap = new Map(listed.map(model => [model.modelId, model]));
    if (input.selectedModels.some(model => !listedMap.has(model.modelId))) {
      throw new RealAISearchError("MODEL_NOT_FOUND", 422);
    }

    const verified = await Promise.all(input.selectedModels.map(async selected => {
      try {
        await verifyGatewayModel({
          protocol,
          baseUrl,
          apiKey: input.apiKey.trim(),
          modelId: selected.modelId,
          signal: controller.signal,
        });
      } catch (error) {
        const normalized = error instanceof Error && /^[A-Z][A-Z0-9_]+$/.test(error.message)
          ? error.message
          : normalizeProviderRuntimeError(error);
        const status = modelVerificationStatusForError(normalized);
        throw new RealAISearchError(`${status}:${selected.modelId}`, 422);
      }
      const listedModel = listedMap.get(selected.modelId)!;
      return {
        id: crypto.randomUUID(),
        modelId: selected.modelId,
        displayName: listedModel.displayName,
        family: selected.family,
        isDefault: selected.isDefault,
        capabilities: verifiedCapabilities(),
        compatibilityLevel: "BASIC" as const,
        verifiedAt: new Date(),
      };
    }));

    const connectionId = crypto.randomUUID();
    const encryptedSecret = await encryptProviderApiKey(
      input.apiKey.trim(),
      projectId,
      `GATEWAY:${connectionId}`,
    );
    const created = await gatewayRepository.create(userId, projectId, {
      id: connectionId,
      name: input.name.trim(),
      baseUrl,
      protocol,
      encryptedSecret,
      models: verified,
    });
    if (!created) throw new RealAISearchError("PROJECT_FORBIDDEN", 403);
    return created;
  } catch (error) {
    if (error instanceof RealAISearchError) throw error;
    if (error instanceof Error && /unique|duplicate/i.test(error.message)) {
      throw new RealAISearchError("GATEWAY_NAME_EXISTS", 409);
    }
    throw safeRuntimeError(error);
  } finally {
    clearTimeout(timer);
  }
}

export async function deleteGatewayConnection(
  userId: string,
  projectId: string,
  connectionId: string,
) {
  await ownedProject(userId, projectId);
  const removed = await gatewayRepository.remove(userId, projectId, connectionId);
  if (!removed) throw new RealAISearchError("GATEWAY_CONNECTION_NOT_FOUND", 404);
  return { ok: true };
}

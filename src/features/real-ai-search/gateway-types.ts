import type {
  AIModelVerificationStatus,
  ProviderCapabilities,
  ProviderCompatibilityLevel,
} from "./types";

export const AI_SEARCH_GATEWAY_PROTOCOLS = [
  "OPENAI_COMPATIBLE",
  "ANTHROPIC_COMPATIBLE",
  "GEMINI_COMPATIBLE",
] as const;
export type AISearchGatewayProtocol = typeof AI_SEARCH_GATEWAY_PROTOCOLS[number];

export const AI_SEARCH_MODEL_FAMILIES = ["OPENAI", "GEMINI", "CLAUDE", "PERPLEXITY"] as const;
export type AISearchModelFamily = typeof AI_SEARCH_MODEL_FAMILIES[number];

export type GatewayModelCandidate = {
  modelId: string;
  displayName: string;
  family: AISearchModelFamily;
};

export type GatewayModelView = GatewayModelCandidate & {
  id: string;
  enabled: boolean;
  isDefault: boolean;
  verificationStatus: AIModelVerificationStatus;
  verifiedAt: string | null;
  capabilities: ProviderCapabilities | null;
  compatibilityLevel: ProviderCompatibilityLevel;
};

export type GatewayConnectionView = {
  id: string;
  name: string;
  baseUrlHost: string;
  protocol: AISearchGatewayProtocol;
  enabled: boolean;
  keyMask: string;
  keyVersion: number;
  lastTestStatus: "SUCCEEDED" | "FAILED" | null;
  lastTestError: string | null;
  lastTestedAt: string | null;
  models: GatewayModelView[];
  createdAt: string;
  updatedAt: string;
};

export function inferModelFamily(modelId: string): AISearchModelFamily {
  const normalized = modelId.toLowerCase();
  if (normalized.includes("claude")) return "CLAUDE";
  if (normalized.includes("gemini")) return "GEMINI";
  if (normalized.includes("sonar") || normalized.includes("perplexity")) return "PERPLEXITY";
  return "OPENAI";
}

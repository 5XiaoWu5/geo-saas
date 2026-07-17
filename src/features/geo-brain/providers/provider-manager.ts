import { OpenAICompatibleProvider } from "@/features/geo-brain/providers/openai-compatible";
import type { AIProvider, AIProviderConfig } from "@/features/geo-brain/providers/types";

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4o-mini";

function readConfig(): AIProviderConfig | null {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) return null;

  return {
    provider: process.env.AI_PROVIDER || "openai-compatible",
    baseUrl: process.env.AI_BASE_URL || DEFAULT_BASE_URL,
    apiKey,
    model: process.env.AI_MODEL || DEFAULT_MODEL,
  };
}

export function getAIProvider(): AIProvider | null {
  const config = readConfig();
  if (!config) return null;
  return new OpenAICompatibleProvider(config);
}

export function getAIProviderMetadata() {
  const config = readConfig();
  return {
    configured: Boolean(config),
    provider: config?.provider ?? "local",
    model: config?.model ?? "geo-brain-rules",
  };
}

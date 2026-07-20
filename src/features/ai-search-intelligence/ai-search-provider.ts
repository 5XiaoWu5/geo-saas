import type { AISearchIntent, AISearchPlatform } from "./types";

export type AISearchProviderRequest = {
  query: string;
  intent: AISearchIntent;
  targetEntity: string;
  industry: string;
};

export type AISearchProviderResult = {
  providerRequestId: string;
  rawResponse: string;
  mentioned: boolean;
  position: number | null;
  citations: string[];
};

export interface AISearchProvider {
  readonly platform: AISearchPlatform;
  evaluate(request: AISearchProviderRequest): Promise<AISearchProviderResult>;
}

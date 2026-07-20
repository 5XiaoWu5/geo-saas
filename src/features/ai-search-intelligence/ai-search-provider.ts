import type { AISearchProviderType, ParsedAISearchResponse, ProviderCheck, ProviderQueryRequest, ProviderRawResponse, ResponseAnalysisInput } from "@/features/real-ai-search/types";

export interface AISearchProvider {
  readonly provider: AISearchProviderType;
  check(context: { apiKey: string | null; model: string }): Promise<ProviderCheck>;
  query(request: ProviderQueryRequest, context: { apiKey: string; model: string; signal: AbortSignal }): Promise<ProviderRawResponse>;
  analyzeResponse(response: ProviderRawResponse, input: ResponseAnalysisInput): ParsedAISearchResponse;
  extractCitation(response: ProviderRawResponse): string[];
}

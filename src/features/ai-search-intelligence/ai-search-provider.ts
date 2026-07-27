import type {
  AISearchProviderType,
  ParsedAISearchResponse,
  ProviderCheck,
  ProviderConnectionContext,
  ProviderModelOption,
  ProviderQueryRequest,
  ProviderRawResponse,
  ResponseAnalysisInput,
} from "@/features/real-ai-search/types";

export interface AISearchProvider {
  readonly provider: AISearchProviderType;
  check(context: { apiKey: string | null; model: string }): Promise<ProviderCheck>;
  listModels(context: Omit<ProviderConnectionContext, "model">): Promise<ProviderModelOption[]>;
  query(request: ProviderQueryRequest, context: ProviderConnectionContext): Promise<ProviderRawResponse>;
  analyzeResponse(response: ProviderRawResponse, input: ResponseAnalysisInput): ParsedAISearchResponse;
  extractCitation(response: ProviderRawResponse): string[];
}

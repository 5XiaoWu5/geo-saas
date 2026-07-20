export const AI_SEARCH_PROVIDER_TYPES = ["OPENAI", "GEMINI", "CLAUDE", "PERPLEXITY"] as const;
export type AISearchProviderType = typeof AI_SEARCH_PROVIDER_TYPES[number];
export type AISearchIntent = "BUYING" | "RESEARCH" | "COMPARISON" | "LOCAL_SEARCH" | "TECHNICAL";
export type AISearchExecutionStatus = "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED";

export const PROVIDER_LABELS: Record<AISearchProviderType, string> = { OPENAI: "ChatGPT / OpenAI", GEMINI: "Gemini", CLAUDE: "Claude", PERPLEXITY: "Perplexity" };
export const DEFAULT_PROVIDER_MODELS: Record<AISearchProviderType, string> = { OPENAI: "gpt-5-mini", GEMINI: "gemini-2.5-flash", CLAUDE: "claude-sonnet-4-20250514", PERPLEXITY: "sonar" };

export type ProviderQueryRequest = { query: string; intent: AISearchIntent; targetEntity: string; industry: string };
export type ProviderRawResponse = { requestId: string | null; text: string; citations: string[]; raw: unknown };
export type ProviderCheck = { available: boolean; reason: string | null };
export type ResponseAnalysisInput = { targetEntity: string; officialDomain: string; productNames: string[]; competitorNames: string[] };
export type ParsedCitation = { url: string; domain: string; citationType: "OFFICIAL" | "THIRD_PARTY"; position: number; citationCount: number };
export type ParsedAISearchResponse = { mentioned: boolean; rankPosition: number | null; productMentions: string[]; competitorBrands: string[]; citations: ParsedCitation[] };

export type ProviderConfigView = { id: string | null; provider: AISearchProviderType; enabled: boolean; configured: boolean; model: string; createdAt: string | null; updatedAt: string | null };
export type ProviderStats = { provider: AISearchProviderType; total: number; succeeded: number; failed: number; lastCheckedAt: string | null; config: ProviderConfigView };
export type ExecutionResultView = { id: string; query: string; provider: AISearchProviderType; status: AISearchExecutionStatus; mentioned: boolean | null; rankPosition: number | null; rawResponse: string | null; citations: ParsedCitation[]; productMentions: string[]; competitorBrands: string[]; errorCode: string | null; durationMs: number | null; attemptCount: number; createdAt: string; completedAt: string | null };
export type MonitoringResponse = { project: { id: string; name: string; industry: string; domain: string }; providers: ProviderStats[]; results: ExecutionResultView[] };

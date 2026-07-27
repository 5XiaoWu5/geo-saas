export const AI_SEARCH_PROVIDER_TYPES = ["OPENAI", "GEMINI", "CLAUDE", "PERPLEXITY"] as const;
export type AISearchProviderType = typeof AI_SEARCH_PROVIDER_TYPES[number];
export const AI_SEARCH_CONNECTION_TYPES = ["OPENAI_OFFICIAL", "OPENAI_COMPATIBLE", "NATIVE"] as const;
export type AISearchConnectionType = typeof AI_SEARCH_CONNECTION_TYPES[number];
export type AISearchIntent = "BUYING" | "RESEARCH" | "COMPARISON" | "LOCAL_SEARCH" | "TECHNICAL";
export type AISearchExecutionStatus = "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED";
export type AISearchDetectionSource = "OFFICIAL_API" | "COMPATIBLE_GATEWAY" | "REAL_PRODUCT_VERIFICATION";
export type AIModelVerificationStatus =
  | "LISTED_NOT_TESTED"
  | "VERIFYING"
  | "VERIFIED_AVAILABLE"
  | "NO_ACCESS"
  | "MODEL_NOT_FOUND"
  | "INSUFFICIENT_BALANCE"
  | "RATE_LIMITED"
  | "TEMPORARILY_UNAVAILABLE"
  | "UNSUPPORTED"
  | "VERIFICATION_FAILED";
export type ProviderCapabilityStatus = "SUPPORTED" | "UNSUPPORTED" | "UNAVAILABLE" | "FAILED" | "NOT_TESTED";
export type ProviderCompatibilityLevel = "NOT_TESTED" | "BASIC" | "PARTIAL" | "FULL" | "UNAVAILABLE";

export const PROVIDER_LABELS: Record<AISearchProviderType, string> = { OPENAI: "OpenAI API", GEMINI: "Gemini API", CLAUDE: "Claude API", PERPLEXITY: "Perplexity API" };
export const DEFAULT_PROVIDER_MODELS: Record<AISearchProviderType, string> = { OPENAI: "gpt-5-mini", GEMINI: "gemini-2.5-flash", CLAUDE: "claude-sonnet-4-20250514", PERPLEXITY: "sonar" };

export type ProviderQueryRequest = { query: string; intent: AISearchIntent; targetEntity: string; industry: string };
export type ProviderRawResponse = { requestId: string | null; text: string; citations: string[]; raw: unknown };
export type ProviderCheck = { available: boolean; reason: string | null };
export type ProviderConnectionContext = {
  apiKey: string;
  model: string;
  connectionType: AISearchConnectionType;
  baseUrl: string | null;
  signal: AbortSignal;
  verificationOnly?: boolean;
};
export type ProviderModelOption = {
  modelId: string;
  displayName: string;
  provider: AISearchProviderType;
  availability: AIModelVerificationStatus;
  capabilities: Partial<ProviderCapabilities>;
  lastVerifiedAt: string | null;
};
export type ProviderCapabilities = {
  textGeneration: ProviderCapabilityStatus;
  structuredOutput: ProviderCapabilityStatus;
  streaming: ProviderCapabilityStatus;
  toolCalling: ProviderCapabilityStatus;
  webSearch: ProviderCapabilityStatus;
  citationSources: ProviderCapabilityStatus;
};
export type ProviderModelVerification = {
  status: AIModelVerificationStatus;
  compatibilityLevel: ProviderCompatibilityLevel;
  capabilities: ProviderCapabilities;
  requestId: string | null;
  verifiedAt: string | null;
};
export type ResponseAnalysisInput = { targetEntity: string; officialDomain: string; productNames: string[]; competitorNames: string[] };
export type ParsedCitation = { url: string; domain: string; citationType: "OFFICIAL" | "THIRD_PARTY"; position: number; citationCount: number };
export type ParsedAISearchResponse = { mentioned: boolean; rankPosition: number | null; productMentions: string[]; competitorBrands: string[]; citations: ParsedCitation[] };

export type ProviderConfigView = {
  id: string | null;
  provider: AISearchProviderType;
  enabled: boolean;
  configured: boolean;
  keyMask: string | null;
  keyVersion: number | null;
  configurationSource: "ENCRYPTED" | "ENVIRONMENT" | null;
  secretStorageAvailable: boolean;
  connectionType: AISearchConnectionType;
  displayName: string | null;
  baseUrlHost: string | null;
  model: string;
  selectedModelId: string | null;
  modelVerificationStatus: AIModelVerificationStatus;
  modelVerifiedAt: string | null;
  capabilities: ProviderCapabilities | null;
  compatibilityLevel: ProviderCompatibilityLevel;
  lastTestStatus: "SUCCEEDED" | "FAILED" | null;
  lastTestError: string | null;
  lastTestedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};
export type ProviderStats = { provider: AISearchProviderType; total: number; succeeded: number; failed: number; lastCheckedAt: string | null; config: ProviderConfigView };
export type ExecutionResultView = { id: string; query: string; provider: AISearchProviderType; detectionSource: AISearchDetectionSource; status: AISearchExecutionStatus; mentioned: boolean | null; rankPosition: number | null; rawResponse: string | null; citations: ParsedCitation[]; productMentions: string[]; competitorBrands: string[]; errorCode: string | null; durationMs: number | null; attemptCount: number; createdAt: string; completedAt: string | null };
export type MonitoringResponse = { project: { id: string; name: string; industry: string; domain: string }; providers: ProviderStats[]; results: ExecutionResultView[] };

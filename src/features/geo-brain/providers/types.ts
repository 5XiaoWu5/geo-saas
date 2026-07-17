export type AIResponse = {
  text: string;
  model: string;
  provider: string;
  raw?: unknown;
};

export interface AIProvider {
  analyze(prompt: string, context?: unknown): Promise<AIResponse>;
}

export type AIProviderConfig = {
  provider: string;
  baseUrl: string;
  apiKey: string;
  model: string;
};

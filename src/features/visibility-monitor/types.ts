export type AIPlatform = "ChatGPT" | "Gemini" | "Claude";

export type PromptTrackingResult = {
  id: string;
  prompt: string;
  platform: AIPlatform;
  brandMentioned: boolean;
  recommendationPosition: number | null;
  reasonAnalysis: string;
  confidence: number;
  createdAt: string;
};

export type BrandMentionScore = {
  mentionRate: number;
  recommendationRate: number;
  trustScore: number;
};

export type CompetitorVisibility = {
  name: string;
  website: string;
  recommendationProbability: number;
  mentionRate: number;
  trustScore: number;
  isOwnSite?: boolean;
};

export type PromptTemplate = {
  id: string;
  category: "Recommendation" | "Comparison" | "Local Intent" | "Commercial" | "Trust";
  prompt: string;
  intent: string;
};

export type VisibilityMonitorData = {
  trackingResults: PromptTrackingResult[];
  brandScore: BrandMentionScore;
  competitors: CompetitorVisibility[];
  templates: PromptTemplate[];
};

export type VisibilityProviderResponse = {
  provider: AIPlatform;
  prompt: string;
  responseText: string;
  brandMentioned: boolean;
  recommendationPosition: number | null;
  reasons: string[];
};

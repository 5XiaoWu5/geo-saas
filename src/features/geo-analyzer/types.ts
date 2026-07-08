export type GeoScoreLevel = "Excellent" | "Good" | "Need Improvement";

export type GeoScoreFactor = {
  key: "entityCompleteness" | "contentQuality" | "websiteStructure" | "trustSignals" | "citationPotential";
  score: number;
};

export type GeoScoreAnalysis = {
  score: number;
  level: GeoScoreLevel;
  factors: GeoScoreFactor[];
  strengths: string[];
  issues: string[];
  recommendations: string[];
};

export type EntityAnalysis = {
  companyName: string;
  industry: string;
  products: string[];
  location: string;
  brandDescription: string;
  contactInfo: string;
  authorityProof: string[];
};

export type CitationGapItem = {
  key: "newsMedia" | "industrySites" | "thirdPartyPlatforms" | "customerCases" | "authoritativeLinks" | "socialSignals";
  existing: boolean;
  recommendation: string;
};

export type AIAnswerSimulation = {
  engine: "ChatGPT" | "Gemini" | "Claude";
  question: string;
  recommended: boolean;
  answer: string;
  reasons: string[];
  missingReasons: string[];
  recommendations: string[];
};

export type GeoAnalyzerReport = {
  projectId: string;
  inventorySource: {
    pages: number;
    indexedPages: number;
    structuredDataItems: number;
  };
  score: GeoScoreAnalysis;
  entity: EntityAnalysis;
  citationGaps: CitationGapItem[];
  simulations: AIAnswerSimulation[];
};

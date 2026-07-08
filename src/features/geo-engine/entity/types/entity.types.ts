export type WebsiteEntityType = "Organization" | "Person" | "Product" | "Service" | "Place" | "Article";
export type WebsiteEntitySource = "schema" | "meta" | "text";

export type WebsiteEntity = {
  id: string;
  projectId: string;
  type: WebsiteEntityType;
  name: string;
  description: string;
  source: WebsiteEntitySource;
  confidence: number;
};

export type EntityScore = {
  brandPresence: number;
  organizationCompleteness: number;
  authorSignals: number;
  relationshipSignals: number;
  overall: number;
};

export type EntityAnalysis = {
  entities: WebsiteEntity[];
  score: EntityScore;
  issues: string[];
  recommendations: string[];
  evidence: string[];
};

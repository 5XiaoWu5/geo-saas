import type {
  CompanyKnowledgeProfile,
  CustomerCase,
  KnowledgeAssessment,
  KnowledgeChunk,
  KnowledgeDocument,
  ProductEntity,
  ServiceEntity,
  TechnicalDocument,
} from "./types";

export type KnowledgeIntelligenceInput = {
  project: { id: string; name: string; websiteUrl: string; industry: string; description: string };
  products: ProductEntity[];
  services: ServiceEntity[];
  cases: CustomerCase[];
  documents: KnowledgeDocument[];
  technicalDocuments: TechnicalDocument[];
  chunks: KnowledgeChunk[];
};

export type KnowledgeProfileDraft = Omit<CompanyKnowledgeProfile, "id" | "createdAt" | "updatedAt">;

export type KnowledgeIntelligenceOutput = {
  profile: KnowledgeProfileDraft;
  assessment: KnowledgeAssessment;
};

export interface KnowledgeIntelligenceProvider {
  readonly methodVersion: string;
  analyze(input: KnowledgeIntelligenceInput): Promise<KnowledgeIntelligenceOutput>;
}

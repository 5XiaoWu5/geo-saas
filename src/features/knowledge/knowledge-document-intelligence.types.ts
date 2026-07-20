import type { KnowledgeChunk, KnowledgeDocument, ProductEntity } from "./types";

export const KNOWLEDGE_IMPORT_SOURCE_TYPES = ["FILE", "WEBSITE_URL"] as const;
export const KNOWLEDGE_IMPORT_STATUSES = ["UPLOADING", "PROCESSING", "COMPLETED", "FAILED"] as const;

export type KnowledgeImportSourceType = (typeof KNOWLEDGE_IMPORT_SOURCE_TYPES)[number];
export type KnowledgeImportStatus = (typeof KNOWLEDGE_IMPORT_STATUSES)[number];

export type ExtractedEvidenceItem = {
  value: string;
  sourceChunkId: string;
  status: "DRAFT";
};

export type ExtractedProductSuggestion = {
  name: string;
  type: string;
  description: string;
  technicalParameters: string[];
  advantages: string[];
  features: string[];
  applications: string[];
  targetCustomers: string[];
  solves: string[];
  confidence: number;
  evidenceChunkIds: string[];
  status: "DRAFT";
};

export type ExtractedFAQSuggestion = {
  question: string;
  answer: string;
  sourceChunkId: string;
  status: "DRAFT";
};

export type KnowledgeExtractionDraft = {
  extractedProducts: ExtractedProductSuggestion[];
  extractedAdvantages: ExtractedEvidenceItem[];
  extractedFeatures: ExtractedEvidenceItem[];
  extractedApplications: ExtractedEvidenceItem[];
  extractedCustomers: ExtractedEvidenceItem[];
  extractedFAQ: ExtractedFAQSuggestion[];
  confidence: number | null;
};

export type KnowledgeExtractionResult = KnowledgeExtractionDraft & {
  id: string;
  projectId: string;
  importJobId: string;
  sourceDocumentId: string;
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeImportJob = {
  id: string;
  projectId: string;
  sourceDocumentId: string;
  sourceType: KnowledgeImportSourceType;
  fileName: string;
  mimeType: string;
  status: KnowledgeImportStatus;
  progress: number;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  extraction: KnowledgeExtractionResult | null;
};

export type KnowledgeDocumentIntelligenceInput = {
  document: KnowledgeDocument;
  chunks: KnowledgeChunk[];
};

export interface KnowledgeDocumentIntelligenceProvider {
  id: string;
  extract(input: KnowledgeDocumentIntelligenceInput): Promise<KnowledgeExtractionDraft>;
}

export type KnowledgeImportWorkspaceResponse = {
  project: { id: string; name: string; websiteUrl: string };
  jobs: KnowledgeImportJob[];
};

export type ConfirmProductResponse = {
  product: ProductEntity;
  created: boolean;
};

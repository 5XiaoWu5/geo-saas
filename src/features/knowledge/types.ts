export const KNOWLEDGE_STATUSES = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;
export type KnowledgeStatus = (typeof KNOWLEDGE_STATUSES)[number];

export const KNOWLEDGE_SOURCE_TYPES = ["USER_INPUT", "FILE_UPLOAD", "WEBSITE_CRAWL", "AI_GENERATED"] as const;
export type KnowledgeSourceType = (typeof KNOWLEDGE_SOURCE_TYPES)[number];

export const KNOWLEDGE_PROCESSING_STATUSES = ["PENDING", "PROCESSING", "READY", "FAILED"] as const;
export type KnowledgeProcessingStatus = (typeof KNOWLEDGE_PROCESSING_STATUSES)[number];

export type CompanyKnowledgeBase = {
  id: string;
  projectId: string;
  status: KnowledgeStatus;
  version: number;
  completenessScore: number | null;
  understandingScore: number | null;
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeProjectSummary = {
  projectId: string;
  projectName: string;
  websiteUrl: string;
  industry: string;
  knowledgeBase: CompanyKnowledgeBase | null;
  productCount: number;
  serviceCount: number;
  caseCount: number;
  documentCount: number;
  technicalDocumentCount: number;
};

export type ProductEntity = {
  id: string;
  projectId: string;
  sourceId: string;
  name: string;
  category: string;
  description: string;
  features: string[];
  applications: string[];
  targetCustomers: string[];
  confidence: number | null;
  status: KnowledgeStatus;
  createdAt: string;
  updatedAt: string;
};

export type ServiceEntity = {
  id: string;
  projectId: string;
  sourceId: string;
  name: string;
  description: string;
  industries: string[];
  confidence: number | null;
  status: KnowledgeStatus;
  createdAt: string;
  updatedAt: string;
};

export type CustomerCase = {
  id: string;
  projectId: string;
  sourceId: string;
  customerName: string;
  industry: string;
  problem: string;
  solution: string;
  result: string;
  metrics: Record<string, unknown>;
  confidence: number | null;
  status: KnowledgeStatus;
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeDocument = {
  id: string;
  projectId: string;
  sourceId: string;
  name: string;
  mimeType: string;
  size: number;
  processingStatus: KnowledgeProcessingStatus;
  extractedTextStatus: KnowledgeProcessingStatus;
  createdAt: string;
  updatedAt: string;
};

export type TechnicalDocument = {
  id: string;
  projectId: string;
  sourceId: string;
  title: string;
  type: string;
  summary: string;
  technicalFields: Record<string, unknown>;
  confidence: number | null;
  status: KnowledgeStatus;
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeChunk = {
  id: string;
  projectId: string;
  documentId: string;
  content: string;
  hash: string;
  order: number;
  tokenCount: number;
  confidence: number | null;
  createdAt: string;
};

export const KNOWLEDGE_GAP_TYPES = [
  "COMPANY_INFO",
  "PRODUCT_DETAIL",
  "SERVICE_DETAIL",
  "CUSTOMER_CASE",
  "TECHNICAL_PROOF",
  "CERTIFICATION",
  "FAQ",
] as const;
export type KnowledgeGapType = (typeof KNOWLEDGE_GAP_TYPES)[number];
export type KnowledgeGapSeverity = "HIGH" | "MEDIUM" | "LOW";
export type KnowledgeProfileStatus = "available" | "unavailable";
export type KnowledgeEvidenceSourceType = "Project" | "ProductEntity" | "ServiceEntity" | "CustomerCase" | "TechnicalDocument" | "KnowledgeDocument" | "KnowledgeChunk";

export type KnowledgeEvidenceRef = {
  sourceType: KnowledgeEvidenceSourceType;
  sourceId: string;
};

export type KnowledgeProfileItem = KnowledgeEvidenceRef & {
  name: string;
  description?: string;
  details?: string[];
};

export type KnowledgeCertification = KnowledgeEvidenceRef & {
  name: string;
  identifier?: string;
  issuer?: string;
  excerpt: string;
};

export type KnowledgeFaqTopic = KnowledgeEvidenceRef & {
  question: string;
  answer: string;
};

export type KnowledgeGap = {
  type: KnowledgeGapType;
  severity: KnowledgeGapSeverity;
  reason: `knowledge.intelligence.gapReasons.${KnowledgeGapType}`;
  sourceCount: number;
};

export type CompanyKnowledgeProfile = {
  id: string;
  projectId: string;
  companySummary: string | null;
  industry: string | null;
  businessType: "PRODUCT" | "SERVICE" | "HYBRID" | null;
  mainProducts: KnowledgeProfileItem[];
  mainServices: KnowledgeProfileItem[];
  targetCustomers: KnowledgeProfileItem[];
  competitiveAdvantages: KnowledgeProfileItem[];
  certifications: KnowledgeCertification[];
  customerProof: KnowledgeProfileItem[];
  faqTopics: KnowledgeFaqTopic[];
  missingKnowledge: KnowledgeGap[];
  confidence: number | null;
  status: KnowledgeStatus;
  methodVersion: string;
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeAssessment = {
  projectId: string;
  status: KnowledgeProfileStatus;
  completeness: number | null;
  confidence: number | null;
  evidenceCount: number;
  missing: KnowledgeGap[];
};

export type KnowledgeIntelligenceResponse = {
  project: { id: string; name: string; websiteUrl: string; industry: string };
  status: KnowledgeProfileStatus;
  profile: CompanyKnowledgeProfile | null;
  assessment: KnowledgeAssessment;
};

export type CreateProductInput = Pick<ProductEntity, "projectId" | "name" | "category" | "description" | "features" | "applications" | "targetCustomers">;
export type CreateServiceInput = Pick<ServiceEntity, "projectId" | "name" | "description" | "industries">;
export type CreateCustomerCaseInput = Pick<CustomerCase, "projectId" | "customerName" | "industry" | "problem" | "solution" | "result" | "metrics">;

export type KnowledgeWorkspace = {
  project: { id: string; name: string; websiteUrl: string; industry: string };
  knowledgeBase: CompanyKnowledgeBase;
  products: ProductEntity[];
  services: ServiceEntity[];
  cases: CustomerCase[];
  documents: KnowledgeDocument[];
  technicalDocuments: TechnicalDocument[];
};

export type KnowledgeOverviewResponse = {
  projects: KnowledgeProjectSummary[];
};

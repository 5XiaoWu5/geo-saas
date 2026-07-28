export const AI_PRESENCE_STATUSES = [
  "NOT_STARTED",
  "NEEDS_ATTENTION",
  "READY",
  "SUBMITTED",
  "CRAWLED",
  "INDEXED",
  "MENTIONED",
  "CITED",
  "UNAVAILABLE",
  "FAILED",
] as const;

export type AIPresenceStatus = typeof AI_PRESENCE_STATUSES[number];
export type AIPresenceEvidenceStatus = "UNVERIFIED" | "USER_DECLARED" | "VERIFIED" | "FAILED";
export type AIPresenceTaskType =
  | "CHECK_DISCOVERABILITY"
  | "FIX_ROBOTS"
  | "CREATE_SITEMAP"
  | "SUBMIT_SITEMAP"
  | "CREATE_BUSINESS_PROFILE"
  | "SUBMIT_PRODUCT_FEED"
  | "ADD_ORGANIZATION_SCHEMA"
  | "ADD_PRODUCT_SCHEMA"
  | "CREATE_CONTACT_PAGE"
  | "FIX_COMPANY_INFORMATION"
  | "ADD_TRUSTED_SOURCES"
  | "VERIFY_CRAWLING"
  | "VERIFY_INDEXING"
  | "VERIFY_AI_MENTION"
  | "VERIFY_CITATION";
export type AIPresencePlatform =
  | "WEBSITE"
  | "OPENAI"
  | "ANTHROPIC"
  | "GOOGLE_SEARCH_CONSOLE"
  | "GOOGLE_BUSINESS_PROFILE"
  | "GOOGLE_MERCHANT_CENTER"
  | "BING_WEBMASTER_TOOLS"
  | "INDEXNOW"
  | "AI_SEARCH";

export type EvidenceValue<T> = {
  status: "available" | "unavailable" | "failed";
  value: T | null;
  source: string;
  checkedAt: string;
};

export type CrawlerAccess = {
  crawler: "OAI-SearchBot" | "ChatGPT-User" | "Claude-SearchBot" | "Googlebot";
  status: "ALLOWED" | "BLOCKED" | "NO_RULES" | "UNAVAILABLE";
  matchedRule: string | null;
};

export type CorePageKind =
  | "HOME"
  | "ABOUT"
  | "CONTACT"
  | "PRODUCT_LIST"
  | "PRODUCT_DETAIL"
  | "SERVICE_LIST"
  | "SERVICE_DETAIL"
  | "QUALIFICATIONS"
  | "CUSTOMER_CASES"
  | "FAQ"
  | "PRIVACY"
  | "FACTORY_PROFILE"
  | "PRODUCTION_CAPACITY"
  | "QUALITY_CONTROL"
  | "CERTIFICATIONS"
  | "EQUIPMENT"
  | "EXPORT_MARKETS"
  | "CUSTOMIZATION";

export type CorePageEvidence = {
  kind: CorePageKind;
  found: boolean;
  url: string | null;
  source: "HOME" | "SITEMAP" | "PROJECT";
};

export type DiscoverabilityEvidence = {
  version: "ai-presence-check-v1";
  checkedAt: string;
  targetUrl: string;
  homepage: {
    finalUrl: string | null;
    statusCode: number | null;
    accessible: boolean;
    https: boolean;
    contentType: string | null;
    durationMs: number | null;
    mobileStatusCode: number | null;
    language: string | null;
    canonical: string | null;
    canonicalStatus: "VALID" | "MISSING" | "CONFLICT" | "UNAVAILABLE";
    metaRobots: string[];
    xRobotsTag: string[];
    indexingAllowed: boolean | null;
    loginRequired: boolean | null;
    rendering: "SERVER_CONTENT" | "LIKELY_CLIENT_RENDERED" | "UNAVAILABLE";
  };
  robots: {
    url: string;
    statusCode: number | null;
    readable: boolean;
    crawlers: CrawlerAccess[];
  };
  sitemap: {
    url: string;
    statusCode: number | null;
    readable: boolean;
    urlCount: number | null;
  };
  schema: {
    count: number;
    types: string[];
    malformedCount: number;
  };
  corePages: CorePageEvidence[];
  companyConsistency: Array<{
    field: "legalName" | "phone" | "address" | "businessHours";
    status: "CONSISTENT" | "PARTIAL" | "NOT_FOUND" | "UNAVAILABLE";
    checkedUrls: string[];
    matchedUrls: string[];
  }>;
  errorCode: string | null;
};

export type AIPresenceTaskView = {
  id: string;
  projectId: string;
  taskType: AIPresenceTaskType;
  platform: AIPresencePlatform;
  targetUrl: string | null;
  status: AIPresenceStatus;
  source: string;
  submittedAt: string | null;
  verifiedAt: string | null;
  evidenceStatus: AIPresenceEvidenceStatus;
  evidenceSummary: string;
  evidence: Record<string, unknown>;
  errorCode: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CompanyPresenceProfile = {
  projectId: string;
  projectName: string;
  officialWebsite: string;
  legalName: string;
  brandName: string;
  description: string;
  industry: string;
  region: string;
  products: string[];
  services: string[];
  phone: string;
  email: string;
  address: string;
  serviceAreas: string[];
  businessHours: string;
  foundedAt: string;
  representative: string;
  businessType: string;
  logoUrl: string;
  socialProfiles: string[];
  trustedSources: string[];
  factory: Record<string, string>;
  updatedAt: string | null;
};

export type PresenceIssue = {
  key: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  title: string;
  reason: string;
  action: string;
};

export type PresenceNextStep = {
  key: string;
  label: string;
  href: string | null;
  action: "EDIT_PROFILE" | "RUN_CHECK" | "VIEW_EVIDENCE" | "SUBMIT_PLATFORM" | "RUN_AI_CHECK";
};

export type AIPresenceSummary = {
  projectId: string;
  readiness: AIPresenceStatus;
  stages: Record<"READY" | "SUBMITTED" | "CRAWLED" | "INDEXED" | "MENTIONED" | "CITED", boolean>;
  profile: CompanyPresenceProfile;
  profileFields: Array<{
    key: string;
    complete: boolean;
    value: string | string[];
    source: string;
    updatedAt: string | null;
  }>;
  issues: PresenceIssue[];
  completed: Array<{ title: string; source: string; completedAt: string }>;
  nextStep: PresenceNextStep;
  latestCheck: AIPresenceTaskView | null;
  tasks: AIPresenceTaskView[];
  platformTasks: AIPresenceTaskView[];
  schemaRecommendations: Array<{
    type: string;
    status: "READY" | "NEEDS_INFORMATION" | "NOT_APPLICABLE" | "EXISTS" | "ERROR" | "CONFLICT";
    missingFields: string[];
    targetPage: string;
    jsonLd: Record<string, unknown> | null;
  }>;
  platforms: Array<{
    platform: AIPresencePlatform;
    name: string;
    category: "SEARCH_INDEX" | "LOCAL_BUSINESS" | "PRODUCT_DATA" | "SITEMAP_SUBMISSION";
    officialUrl: string;
    taskType: AIPresenceTaskType;
  }>;
  aiEvidence: {
    mentioned: boolean;
    cited: boolean;
    resultCount: number;
    citationCount: number;
    sourceLabels: string[];
  };
};

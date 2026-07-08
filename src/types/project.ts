export type ProjectLanguage = "English" | "Chinese" | "Spanish" | "German" | "Japanese";
export type ProjectCountry = "United States" | "China" | "United Kingdom" | "Germany" | "Japan" | "Singapore";
export type ProjectIndustry = "SaaS" | "Fintech" | "Healthcare" | "E-commerce" | "Education" | "Manufacturing";

export type Project = {
  id: string;
  workspaceId: string;
  name: string;
  websiteUrl: string;
  url: string;
  language: ProjectLanguage;
  country: ProjectCountry;
  industry: ProjectIndustry;
  description: string;
  createdAt: string;
  lastAnalysisAt: string | null;
  lastScan: string | null;
  reportsCount: number;
  geoScore: number;
  visibilityScore: number;
  status: "Active" | "Monitoring" | "Paused";
};

export type ProjectFormValues = Pick<Project, "name" | "websiteUrl" | "language" | "country" | "industry" | "description">;

export type ProjectSortKey = "createdAt" | "lastAnalysisAt" | "name";
export type ProjectViewMode = "card" | "list";


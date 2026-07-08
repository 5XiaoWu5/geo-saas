export type OptimizationPriority = "High" | "Medium" | "Low";
export type OptimizationStatus = "Todo" | "Done";
export type OptimizationSource = "GEO Engine" | "Visibility Monitor";
export type ContentGenerationType = "FAQ" | "Company Intro" | "Product Description" | "Blog Article";
export type SchemaGenerationType = "Organization Schema" | "Product Schema" | "FAQ Schema";

export type OptimizationTask = {
  id: string;
  title: string;
  description: string;
  source: OptimizationSource;
  priority: OptimizationPriority;
  estimatedLift: number;
  status: OptimizationStatus;
  issueId?: string;
  completedAt?: string | null;
};

export type GeneratedContent = {
  id: string;
  type: ContentGenerationType;
  title: string;
  content: string;
  targetTaskId: string;
};

export type GeneratedSchema = {
  id: string;
  type: SchemaGenerationType;
  jsonLd: string;
  targetTaskId: string;
};

export type OptimizationDashboardStats = {
  todoTasks: number;
  doneTasks: number;
  predictedGeoLift: number;
};

export type OptimizationCenterData = {
  tasks: OptimizationTask[];
  generatedContent: GeneratedContent[];
  generatedSchemas: GeneratedSchema[];
  stats: OptimizationDashboardStats;
};

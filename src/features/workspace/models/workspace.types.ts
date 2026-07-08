export type WorkspacePlan = "free" | "starter" | "professional" | "enterprise";

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  plan: WorkspacePlan;
};

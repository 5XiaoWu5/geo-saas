export type ProjectActivity = {
  id: string;
  type: "scan" | "optimization" | "content";
  title: string;
  description: string;
  createdAt: string;
};

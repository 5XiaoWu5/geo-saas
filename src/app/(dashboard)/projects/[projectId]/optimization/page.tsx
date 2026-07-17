import { OptimizationWorkspace } from "@/features/optimization/optimization-workspace";

export default async function ProjectOptimizationPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <OptimizationWorkspace initialProjectId={projectId} />;
}

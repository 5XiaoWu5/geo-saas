import { OptimizationWorkspace } from "@/features/optimization/optimization-workspace";

export const dynamic = "force-dynamic";

export default async function OptimizationPage({ searchParams }: { searchParams: Promise<{ projectId?: string }> }) {
  const { projectId } = await searchParams;
  return <OptimizationWorkspace initialProjectId={projectId} />;
}

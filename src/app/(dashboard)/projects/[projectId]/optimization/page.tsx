import { OptimizationWorkspace } from "@/features/optimization/optimization-workspace";

export default async function ProjectOptimizationPage({ params, searchParams }: { params: Promise<{ projectId: string }>; searchParams: Promise<{ issueId?: string }> }) {
  const [{ projectId }, { issueId }] = await Promise.all([params, searchParams]);
  return <OptimizationWorkspace initialProjectId={projectId} initialIssueId={issueId} />;
}

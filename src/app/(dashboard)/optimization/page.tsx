import { OptimizationWorkspace } from "@/features/optimization/optimization-workspace";

export const dynamic = "force-dynamic";

export default async function OptimizationPage({ searchParams }: { searchParams: Promise<{ projectId?: string; issueId?: string }> }) {
  const { projectId, issueId } = await searchParams;
  return <OptimizationWorkspace initialProjectId={projectId} initialIssueId={issueId} />;
}

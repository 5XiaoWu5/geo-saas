import { InsightsWorkspace } from "@/features/insights";

export const dynamic = "force-dynamic";

export default async function ProjectInsightsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <InsightsWorkspace initialProjectId={projectId} />;
}

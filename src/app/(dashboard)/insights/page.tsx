import { InsightsWorkspace } from "@/features/insights";

export const dynamic = "force-dynamic";

export default async function InsightsPage({ searchParams }: { searchParams: Promise<{ projectId?: string }> }) {
  const { projectId } = await searchParams;
  return <InsightsWorkspace initialProjectId={projectId} />;
}


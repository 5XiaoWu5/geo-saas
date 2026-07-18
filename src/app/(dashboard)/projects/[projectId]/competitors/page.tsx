import { CompetitorManager } from "@/features/competitor-benchmark/components/CompetitorManager";

export default async function ProjectCompetitorsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <CompetitorManager projectId={projectId} />;
}

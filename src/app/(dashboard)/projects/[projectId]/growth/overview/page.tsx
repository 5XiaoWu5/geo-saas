import { GrowthWorkspace } from "@/features/growth/growth-workspace";

export default async function ProjectGrowthOverviewPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <GrowthWorkspace initialProjectId={projectId} view="overview" />;
}

import { GrowthWorkspace } from "@/features/growth/growth-workspace";

export default async function ProjectGrowthAliasPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <GrowthWorkspace initialProjectId={projectId} />;
}


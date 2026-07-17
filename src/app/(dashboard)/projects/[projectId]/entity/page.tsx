import { EntityWorkspace } from "@/features/entity/entity-workspace";

export default async function ProjectEntityPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <EntityWorkspace initialProjectId={projectId} />;
}

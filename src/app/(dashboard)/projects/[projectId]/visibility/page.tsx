import { VisibilityWorkspace } from "@/features/visibility/visibility-workspace";

export default async function ProjectVisibilityPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <VisibilityWorkspace initialProjectId={projectId} />;
}

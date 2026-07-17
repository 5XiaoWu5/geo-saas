import { VisibilityWorkspace } from "@/features/visibility/visibility-workspace";

export const dynamic = "force-dynamic";

export default async function VisibilityPage({ searchParams }: { searchParams: Promise<{ projectId?: string }> }) {
  const { projectId } = await searchParams;
  return <VisibilityWorkspace initialProjectId={projectId} />;
}

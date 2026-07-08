import { redirect } from "next/navigation";

export default async function ProjectCenterIndexPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  redirect(`/projects/${projectId}/overview`);
}

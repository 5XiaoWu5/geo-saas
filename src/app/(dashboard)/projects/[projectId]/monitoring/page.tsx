import { redirect } from "next/navigation";

export default async function ProjectMonitoringPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  redirect(`/projects/${projectId}`);
}

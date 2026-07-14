import { redirect } from "next/navigation";

export default async function ProjectOptimizationPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  redirect(`/projects/${projectId}`);
}

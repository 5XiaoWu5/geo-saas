import { ClientRedirect } from "@/components/shared/client-redirect";
import { projects } from "@/features/project-center/data/projects";

export function generateStaticParams() {
  return projects.map((project) => ({ projectId: project.id }));
}

export default async function ProjectCenterIndexPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <ClientRedirect to={`/projects/${projectId}/overview`} />;
}
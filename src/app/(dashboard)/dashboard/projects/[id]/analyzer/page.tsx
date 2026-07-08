import { ClientRedirect } from "@/components/shared/client-redirect";
import { projects } from "@/features/project-center/data/projects";

export const dynamicParams = false;

export function generateStaticParams() {
  return projects.map((project) => ({ id: project.id }));
}

export default async function LegacyAnalyzerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ClientRedirect to={`/projects/${id}/analyzer`} />;
}
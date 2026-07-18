import { KnowledgeProjectClient } from "@/features/knowledge/components/knowledge-page-clients";

export default async function ProjectKnowledgePage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <KnowledgeProjectClient projectId={projectId} />;
}

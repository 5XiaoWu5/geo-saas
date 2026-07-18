import { KnowledgeWorkspace } from "@/features/knowledge/components/knowledge-workspace";

export default async function ProjectKnowledgePage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <KnowledgeWorkspace projectId={projectId} />;
}

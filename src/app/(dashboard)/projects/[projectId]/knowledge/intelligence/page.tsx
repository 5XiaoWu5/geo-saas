import { KnowledgeIntelligenceWorkspace } from "@/features/knowledge/components/knowledge-intelligence-workspace";

export default async function ProjectKnowledgeIntelligencePage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <KnowledgeIntelligenceWorkspace projectId={projectId} />;
}

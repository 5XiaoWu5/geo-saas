import { KnowledgeIntelligenceProjectClient } from "@/features/knowledge/components/knowledge-page-clients";

export default async function ProjectKnowledgeIntelligencePage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <KnowledgeIntelligenceProjectClient projectId={projectId} />;
}

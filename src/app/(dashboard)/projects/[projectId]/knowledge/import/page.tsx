import { KnowledgeImportWorkspace } from "@/features/knowledge/components/knowledge-import-workspace";

export default async function KnowledgeImportPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <KnowledgeImportWorkspace projectId={projectId} />;
}

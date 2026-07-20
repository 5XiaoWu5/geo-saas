import { AISearchIntelligenceWorkspace } from "@/features/ai-search-intelligence/ai-search-intelligence-workspace";

export default async function ProjectAISearchIntelligencePage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <AISearchIntelligenceWorkspace projectId={projectId} />;
}

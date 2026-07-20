import { AISearchCommandCenter } from "@/features/ai-search-growth/ai-search-command-center";

export default async function AISearchCommandCenterPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <AISearchCommandCenter projectId={projectId} />;
}

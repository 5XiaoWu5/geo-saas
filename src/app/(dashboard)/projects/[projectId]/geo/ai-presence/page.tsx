import { AIPresenceCenter } from "@/features/ai-presence/ai-presence-center";

export default async function AIPresencePage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <AIPresenceCenter projectId={projectId} />;
}

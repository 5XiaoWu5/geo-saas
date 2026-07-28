import { AIPresenceTaskDetail } from "@/features/ai-presence/ai-presence-task-detail";

export default async function AIPresenceTaskPage({
  params,
}: {
  params: Promise<{ projectId: string; taskId: string }>;
}) {
  const { projectId, taskId } = await params;
  return <AIPresenceTaskDetail projectId={projectId} taskId={taskId} />;
}

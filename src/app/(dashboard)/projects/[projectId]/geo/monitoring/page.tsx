import { RealAISearchMonitoringWorkspace } from "@/features/real-ai-search/real-ai-search-monitoring-workspace";
export default async function RealAISearchMonitoringPage({ params }: { params: Promise<{ projectId: string }> }) { const { projectId } = await params; return <RealAISearchMonitoringWorkspace projectId={projectId} />; }

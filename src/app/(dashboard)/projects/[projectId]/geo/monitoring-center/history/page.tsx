import { MonitoringHistoryWorkspace } from "@/features/monitoring-automation/monitoring-history-workspace";
export default async function MonitoringHistoryPage({ params }: { params: Promise<{ projectId: string }> }) { const { projectId } = await params; return <MonitoringHistoryWorkspace projectId={projectId} />; }

import { MonitoringCenterWorkspace } from "@/features/monitoring-automation/monitoring-center-workspace";
export default async function MonitoringCenterPage({ params }: { params: Promise<{ projectId: string }> }) { const { projectId } = await params; return <MonitoringCenterWorkspace projectId={projectId} />; }

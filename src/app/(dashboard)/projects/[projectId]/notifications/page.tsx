import { NotificationCenterWorkspace } from "@/features/monitoring-automation/notification-center-workspace";
export default async function NotificationCenterPage({ params }: { params: Promise<{ projectId: string }> }) { const { projectId } = await params; return <NotificationCenterWorkspace projectId={projectId} />; }

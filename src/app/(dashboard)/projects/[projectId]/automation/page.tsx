import { AutomationConsole } from "@/features/automation/automation-console";

export default async function AutomationPage({ params }: { params: Promise<{ projectId: string }> }) { const { projectId } = await params; return <AutomationConsole projectId={projectId} />; }

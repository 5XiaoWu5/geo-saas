import { SimulatorWorkspace } from "@/features/ai-search-simulator";

export default async function ProjectSimulatorPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <SimulatorWorkspace initialProjectId={projectId} />;
}


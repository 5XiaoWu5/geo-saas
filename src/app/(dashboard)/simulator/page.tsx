import { SimulatorWorkspace } from "@/features/ai-search-simulator";

export default async function SimulatorPage({ searchParams }: { searchParams: Promise<{ projectId?: string; campaignId?: string; queryId?: string }> }) {
  const params = await searchParams;
  return <SimulatorWorkspace initialProjectId={params.projectId} initialCampaignId={params.campaignId} initialQueryId={params.queryId} />;
}

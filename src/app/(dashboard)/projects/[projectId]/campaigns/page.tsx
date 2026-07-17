import { CampaignWorkspace } from "@/features/geo-campaign";

export default async function ProjectCampaignsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <CampaignWorkspace initialProjectId={projectId} />;
}


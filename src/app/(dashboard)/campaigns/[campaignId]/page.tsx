import { CampaignWorkspace } from "@/features/geo-campaign";

export default async function CampaignDetailPage({ params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  return <CampaignWorkspace initialCampaignId={campaignId} />;
}


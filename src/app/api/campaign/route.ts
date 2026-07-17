import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/server/session";
import { loadCampaignWorkspace } from "@/features/geo-campaign/campaign.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId");
  const campaignId = url.searchParams.get("campaignId");
  const data = await loadCampaignWorkspace(user.id, projectId, campaignId);

  return NextResponse.json(data);
}


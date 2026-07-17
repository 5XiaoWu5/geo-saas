import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/server/session";
import { CampaignServiceError, loadCampaignDetail } from "@/features/geo-campaign/campaign.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { id } = await params;
  try {
    const detail = await loadCampaignDetail(user.id, id);
    return NextResponse.json(detail);
  } catch (error) {
    if (error instanceof CampaignServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}


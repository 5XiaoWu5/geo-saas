import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/features/auth/server/session";
import { CampaignServiceError, generateQueriesForCampaign } from "@/features/geo-campaign/campaign.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const generateSchema = z.object({
  campaignId: z.string().min(1),
  targetCustomers: z.string().trim().max(1000).default(""),
  queryCount: z.coerce.number().int().optional(),
});

async function readJson(request: Request) {
  try {
    return await request.json() as unknown;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const parsed = generateSchema.safeParse(await readJson(request));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_GENERATE_INPUT" }, { status: 400 });

  try {
    const detail = await generateQueriesForCampaign(user.id, parsed.data.campaignId, parsed.data.targetCustomers, parsed.data.queryCount);
    return NextResponse.json(detail, { status: 201 });
  } catch (error) {
    if (error instanceof CampaignServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}


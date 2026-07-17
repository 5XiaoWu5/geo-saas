import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/features/auth/server/session";
import { CampaignServiceError, createGeoCampaign } from "@/features/geo-campaign/campaign.service";
import { GEO_CAMPAIGN_PLATFORMS } from "@/features/geo-campaign/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().trim().min(1).max(180),
  industry: z.string().trim().min(1).max(180),
  businessDescription: z.string().trim().min(1).max(4000),
  goal: z.string().trim().min(1).max(1000),
  targetCustomers: z.string().trim().max(1000).default(""),
  platforms: z.array(z.enum(GEO_CAMPAIGN_PLATFORMS)).min(1),
  queryCount: z.coerce.number().int().refine((value) => [50, 100, 500].includes(value)),
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

  const parsed = createSchema.safeParse(await readJson(request));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_CAMPAIGN_INPUT" }, { status: 400 });

  try {
    const result = await createGeoCampaign(user.id, parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof CampaignServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}


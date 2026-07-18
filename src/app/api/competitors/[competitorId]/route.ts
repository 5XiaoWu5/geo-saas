import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/features/auth/server/session";
import { COMPETITOR_STATUSES } from "@/features/competitor-benchmark/types";
import { CompetitorServiceError, deleteCompetitor, getCompetitor, updateCompetitor } from "@/features/competitor-benchmark/competitor.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const updateSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  domain: z.string().trim().min(1).max(500).optional(),
  industry: z.string().trim().max(160).optional(),
  region: z.string().trim().max(160).optional(),
  status: z.enum(COMPETITOR_STATUSES).optional(),
  metadata: z.record(z.unknown()).optional(),
}).strict().refine((value) => Object.keys(value).length > 0);

function serviceResponse(error: unknown) {
  if (error instanceof CompetitorServiceError) return NextResponse.json({ error: error.message }, { status: error.status });
  return NextResponse.json({ error: "REQUEST_FAILED" }, { status: 500 });
}

export async function GET(_request: Request, { params }: { params: Promise<{ competitorId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  try {
    const { competitorId } = await params;
    return NextResponse.json({ competitor: await getCompetitor(user.id, competitorId) });
  } catch (error) {
    return serviceResponse(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ competitorId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  try {
    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "INVALID_COMPETITOR_INPUT" }, { status: 400 });
    const { competitorId } = await params;
    return NextResponse.json({ competitor: await updateCompetitor(user.id, competitorId, parsed.data) });
  } catch (error) {
    return serviceResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ competitorId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  try {
    const { competitorId } = await params;
    return NextResponse.json(await deleteCompetitor(user.id, competitorId));
  } catch (error) {
    return serviceResponse(error);
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/features/auth/server/session";
import { CompetitorServiceError, createCompetitor, listCompetitors } from "@/features/competitor-benchmark/competitor.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const metadataSchema = z.record(z.unknown()).optional();
const createSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().trim().min(1).max(160),
  domain: z.string().trim().min(1).max(500),
  industry: z.string().trim().max(160).optional(),
  region: z.string().trim().max(160).optional(),
  metadata: metadataSchema,
}).strict();

function serviceResponse(error: unknown) {
  if (error instanceof CompetitorServiceError) return NextResponse.json({ error: error.message }, { status: error.status });
  return NextResponse.json({ error: "REQUEST_FAILED" }, { status: 500 });
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  try {
    const projectId = new URL(request.url).searchParams.get("projectId") ?? "";
    return NextResponse.json({ projectId, competitors: await listCompetitors(user.id, projectId) });
  } catch (error) {
    return serviceResponse(error);
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  try {
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "INVALID_COMPETITOR_INPUT" }, { status: 400 });
    return NextResponse.json({ competitor: await createCompetitor(user.id, parsed.data) }, { status: 201 });
  } catch (error) {
    return serviceResponse(error);
  }
}

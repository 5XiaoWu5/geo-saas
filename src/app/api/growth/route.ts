import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/features/auth/server/session";
import { createGrowthSnapshot, GrowthServiceError } from "@/features/growth/snapshot.service";
import { loadGrowthWorkspace } from "@/features/growth/timeline.service";
import { GROWTH_EVENT_TYPES, GROWTH_TRIGGER_TYPES } from "@/features/growth/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const snapshotSchema = z.object({
  projectId: z.string().min(1),
  eventType: z.enum(GROWTH_EVENT_TYPES),
  sourceId: z.string().min(1),
  triggerType: z.enum(GROWTH_TRIGGER_TYPES).optional().default("API"),
});

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  try {
    return NextResponse.json(await loadGrowthWorkspace(user.id, searchParams.get("projectId"), searchParams.get("range")));
  } catch (error) {
    if (error instanceof GrowthServiceError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "INVALID_GROWTH_INPUT" }, { status: 400 }); }
  const parsed = snapshotSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "INVALID_GROWTH_INPUT" }, { status: 400 });
  try {
    return NextResponse.json({ snapshot: await createGrowthSnapshot(user.id, parsed.data) }, { status: 201 });
  } catch (error) {
    if (error instanceof GrowthServiceError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
}


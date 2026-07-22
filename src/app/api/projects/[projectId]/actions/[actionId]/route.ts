import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/features/auth/server/session";
import { GrowthActionError, updateGrowthAction } from "@/features/growth-actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const bodySchema = z.object({ status: z.enum(["TODO", "IN_PROGRESS", "COMPLETED", "VERIFIED"]) });
export async function PATCH(request: Request, { params }: { params: Promise<{ projectId: string; actionId: string }> }) {
  const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { projectId, actionId } = await params; const parsed = bodySchema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "INVALID_ACTION_STATUS" }, { status: 400 });
  try { return NextResponse.json({ action: await updateGrowthAction(user.id, projectId, actionId, parsed.data.status) }); } catch (error) { if (error instanceof GrowthActionError) return NextResponse.json({ error: error.code }, { status: error.status }); console.error("growth_action_update_failed", error); return NextResponse.json({ error: "ACTION_UPDATE_FAILED" }, { status: 500 }); }
}

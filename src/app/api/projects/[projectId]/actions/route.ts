import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/server/session";
import { GrowthActionError, listGrowthActions } from "@/features/growth-actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { projectId } = await params;
  try { return NextResponse.json(await listGrowthActions(user.id, projectId)); } catch (error) { if (error instanceof GrowthActionError) return NextResponse.json({ error: error.code }, { status: error.status }); console.error("growth_actions_list_failed", error); return NextResponse.json({ error: "ACTION_REQUEST_FAILED" }, { status: 500 }); }
}

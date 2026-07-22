import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/features/auth/server/session";
import { generateGrowthActions, GrowthActionError } from "@/features/growth-actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const bodySchema = z.object({ reportId: z.string().min(1).optional() });
export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { projectId } = await params; let body: unknown = {}; try { body = await request.json(); } catch { body = {}; }
  const parsed = bodySchema.safeParse(body); if (!parsed.success) return NextResponse.json({ error: "INVALID_ACTION_INPUT" }, { status: 400 });
  try { return NextResponse.json(await generateGrowthActions(user.id, projectId, parsed.data.reportId)); } catch (error) { if (error instanceof GrowthActionError) return NextResponse.json({ error: error.code }, { status: error.status }); console.error("growth_actions_generate_failed", error); return NextResponse.json({ error: "ACTION_GENERATION_FAILED" }, { status: 500 }); }
}

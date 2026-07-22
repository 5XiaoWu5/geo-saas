import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/features/auth/server/session";
import { GrowthAgentError, updateGrowthAgentTask } from "@/features/growth-agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const bodySchema = z.object({ status: z.enum(["TODO", "IN_PROGRESS", "COMPLETED", "VERIFIED"]) });
export async function PATCH(request: Request, { params }: { params: Promise<{ projectId: string; taskId: string }> }) { const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }); const { projectId, taskId } = await params; const parsed = bodySchema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "INVALID_AGENT_STATUS" }, { status: 400 }); try { return NextResponse.json({ task: await updateGrowthAgentTask(user.id, projectId, taskId, parsed.data.status) }); } catch (error) { if (error instanceof GrowthAgentError) return NextResponse.json({ error: error.code }, { status: error.status }); console.error("growth_agent_update_failed", error); return NextResponse.json({ error: "AGENT_UPDATE_FAILED" }, { status: 500 }); } }

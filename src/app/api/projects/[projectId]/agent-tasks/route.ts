import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/features/auth/server/session";
import { generateGrowthAgentTasks, GrowthAgentError, listGrowthAgentTasks } from "@/features/growth-agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const bodySchema = z.object({ actionId: z.string().min(1).optional(), reportId: z.string().min(1).optional() });
function failure(error: unknown) { if (error instanceof GrowthAgentError) return NextResponse.json({ error: error.code }, { status: error.status }); console.error("growth_agent_request_failed", error); return NextResponse.json({ error: "AGENT_REQUEST_FAILED" }, { status: 500 }); }
export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) { const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }); const { projectId } = await params; try { return NextResponse.json(await listGrowthAgentTasks(user.id, projectId)); } catch (error) { return failure(error); } }
export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) { const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }); const { projectId } = await params; const parsed = bodySchema.safeParse(await request.json().catch(() => ({}))); if (!parsed.success) return NextResponse.json({ error: "INVALID_AGENT_INPUT" }, { status: 400 }); try { return NextResponse.json(await generateGrowthAgentTasks(user.id, projectId, parsed.data)); } catch (error) { return failure(error); } }

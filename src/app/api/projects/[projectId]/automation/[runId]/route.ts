import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/features/auth/server/session";
import { AutomationError, controlAutomation, getAutomationRun } from "@/features/automation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const schema = z.object({ action: z.enum(["pause", "resume", "cancel"]) }).strict();
function failure(error: unknown) { return error instanceof AutomationError ? NextResponse.json({ error: error.code }, { status: error.status }) : NextResponse.json({ error: "AUTOMATION_REQUEST_FAILED" }, { status: 500 }); }
export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string; runId: string }> }) { const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }); try { const { projectId, runId } = await params; return NextResponse.json({ run: await getAutomationRun(user.id, projectId, runId) }); } catch (error) { return failure(error); } }
export async function PATCH(request: Request, { params }: { params: Promise<{ projectId: string; runId: string }> }) { const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }); const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "INVALID_AUTOMATION_CONTROL" }, { status: 400 }); try { const { projectId, runId } = await params; return NextResponse.json({ run: await controlAutomation(user.id, projectId, runId, parsed.data.action) }); } catch (error) { return failure(error); } }

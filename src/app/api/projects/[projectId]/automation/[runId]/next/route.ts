import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/server/session";
import { AutomationError, executeNextAutomationStep } from "@/features/automation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(_request: Request, { params }: { params: Promise<{ projectId: string; runId: string }> }) { const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }); try { const { projectId, runId } = await params; return NextResponse.json({ run: await executeNextAutomationStep(user.id, projectId, runId) }); } catch (error) { if (error instanceof AutomationError) return NextResponse.json({ error: error.code }, { status: error.status }); return NextResponse.json({ error: "AUTOMATION_STEP_FAILED" }, { status: 500 }); } }

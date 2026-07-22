import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/server/session";
import { approveAutomationStep, AutomationError } from "@/features/automation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(_request: Request, { params }: { params: Promise<{ projectId: string; runId: string; stepId: string }> }) { const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }); try { const { projectId, runId, stepId } = await params; return NextResponse.json({ run: await approveAutomationStep(user.id, projectId, runId, stepId) }); } catch (error) { if (error instanceof AutomationError) return NextResponse.json({ error: error.code }, { status: error.status }); return NextResponse.json({ error: "AUTOMATION_APPROVAL_FAILED" }, { status: 500 }); } }

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/server/session";
import { AutomationError, listAutomationRuns } from "@/features/automation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) { const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }); try { const { projectId } = await params; return NextResponse.json(await listAutomationRuns(user.id, projectId)); } catch (error) { if (error instanceof AutomationError) return NextResponse.json({ error: error.code }, { status: error.status }); return NextResponse.json({ error: "AUTOMATION_LIST_FAILED" }, { status: 500 }); } }

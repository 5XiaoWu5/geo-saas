import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/features/auth/server/session";
import { AUTOMATION_MODES, AutomationError, previewAutomation } from "@/features/automation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const schema = z.object({ mode: z.enum(AUTOMATION_MODES) }).strict();
export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) { const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }); const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "INVALID_AUTOMATION_MODE" }, { status: 400 }); try { const { projectId } = await params; return NextResponse.json({ run: await previewAutomation(user.id, projectId, parsed.data.mode) }); } catch (error) { if (error instanceof AutomationError) return NextResponse.json({ error: error.code }, { status: error.status }); return NextResponse.json({ error: "AUTOMATION_PREVIEW_FAILED" }, { status: 500 }); } }

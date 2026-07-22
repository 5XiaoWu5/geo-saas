import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/features/auth/server/session";
import { loadNotifications, markNotificationsRead, MonitoringAutomationError } from "@/features/monitoring-automation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const schema = z.object({ notificationId: z.string().trim().min(1).nullable().optional() }).strict();
export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) { const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }); try { const { projectId } = await params; return NextResponse.json(await loadNotifications(user.id, projectId)); } catch (error) { return failure(error); } }
export async function PATCH(request: Request, { params }: { params: Promise<{ projectId: string }> }) { const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }); const parsed = schema.safeParse(await request.json().catch(() => ({}))); if (!parsed.success) return NextResponse.json({ error: "INVALID_NOTIFICATION_UPDATE" }, { status: 400 }); try { const { projectId } = await params; return NextResponse.json(await markNotificationsRead(user.id, projectId, parsed.data.notificationId ?? undefined)); } catch (error) { return failure(error); } }
function failure(error: unknown) { return error instanceof MonitoringAutomationError ? NextResponse.json({ error: error.code }, { status: error.status }) : NextResponse.json({ error: "NOTIFICATION_FAILED" }, { status: 500 }); }

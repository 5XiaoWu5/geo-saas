import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/features/auth/server/session";
import { loadMonitoringCenter, MONITORING_FREQUENCIES, MonitoringAutomationError, saveMonitoringSchedule } from "@/features/monitoring-automation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const schema = z.object({ enabled: z.boolean(), frequency: z.enum(MONITORING_FREQUENCIES), dailyTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), timezone: z.string().trim().min(1).max(100) }).strict();
export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) { const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }); try { const { projectId } = await params; return NextResponse.json({ schedule: (await loadMonitoringCenter(user.id, projectId)).schedule }); } catch (error) { return failure(error); } }
export async function PUT(request: Request, { params }: { params: Promise<{ projectId: string }> }) { const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }); const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "INVALID_MONITORING_SCHEDULE" }, { status: 400 }); try { const { projectId } = await params; return NextResponse.json({ schedule: await saveMonitoringSchedule(user.id, projectId, parsed.data) }); } catch (error) { return failure(error); } }
function failure(error: unknown) { return error instanceof MonitoringAutomationError ? NextResponse.json({ error: error.code }, { status: error.status }) : NextResponse.json({ error: "MONITORING_SCHEDULE_FAILED" }, { status: 500 }); }

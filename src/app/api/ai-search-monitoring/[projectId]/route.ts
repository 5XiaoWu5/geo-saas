import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/server/session";
import { loadMonitoringCenter, MonitoringAutomationError } from "@/features/monitoring-automation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) { const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }); try { const { projectId } = await params; return NextResponse.json(await loadMonitoringCenter(user.id, projectId)); } catch (error) { return failure(error); } }
function failure(error: unknown) { return error instanceof MonitoringAutomationError ? NextResponse.json({ error: error.code }, { status: error.status }) : NextResponse.json({ error: "MONITORING_CENTER_FAILED" }, { status: 500 }); }

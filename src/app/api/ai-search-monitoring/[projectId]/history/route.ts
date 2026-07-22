import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/server/session";
import { AI_SEARCH_PROVIDER_TYPES } from "@/features/real-ai-search/types";
import { loadMonitoringHistory, MonitoringAutomationError, type MonitoringHistoryStatus } from "@/features/monitoring-automation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const statuses: MonitoringHistoryStatus[] = ["SUCCEEDED", "FAILED", "PARTIAL"];
export async function GET(request: Request, { params }: { params: Promise<{ projectId: string }> }) { const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }); const url = new URL(request.url); const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1); const pageSize = Math.max(5, Math.min(50, Number(url.searchParams.get("pageSize") ?? 20) || 20)); const provider = AI_SEARCH_PROVIDER_TYPES.find((item) => item === url.searchParams.get("provider")); const status = statuses.find((item) => item === url.searchParams.get("status")); const search = url.searchParams.get("search")?.trim().slice(0, 100) || undefined; try { const { projectId } = await params; return NextResponse.json(await loadMonitoringHistory(user.id, projectId, { page, pageSize, provider, status, search })); } catch (error) { return error instanceof MonitoringAutomationError ? NextResponse.json({ error: error.code }, { status: error.status }) : NextResponse.json({ error: "MONITORING_HISTORY_FAILED" }, { status: 500 }); } }

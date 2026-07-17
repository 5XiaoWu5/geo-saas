import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/features/auth/server/session";
import { buildProjectInsight, InsightEngineError } from "@/features/insights/insight-engine";
import { createOrReuseInsightTask, localeFromAcceptLanguage } from "@/features/insights/recommendation-builder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  try {
    const { projectId } = await params;
    return NextResponse.json(await buildProjectInsight(user.id, projectId));
  } catch (error) {
    if (error instanceof InsightEngineError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "REQUEST_FAILED" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  try {
    const body = await request.json() as unknown;
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new InsightEngineError("SIGNAL_NOT_ACTIONABLE", 400);
    const keys = Object.keys(body);
    const signalKey = (body as Record<string, unknown>).signalKey;
    if (keys.length !== 1 || keys[0] !== "signalKey" || typeof signalKey !== "string") throw new InsightEngineError("SIGNAL_NOT_ACTIONABLE", 400);
    const { projectId } = await params;
    return NextResponse.json(await createOrReuseInsightTask(user.id, projectId, signalKey, localeFromAcceptLanguage(request.headers.get("accept-language"))));
  } catch (error) {
    if (error instanceof InsightEngineError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "REQUEST_FAILED" }, { status: 500 });
  }
}


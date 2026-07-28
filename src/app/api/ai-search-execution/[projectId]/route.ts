import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/features/auth/server/session";
import { AI_SEARCH_PROVIDER_TYPES, RealAISearchError, executeRealAISearch, getRealAISearchMonitoring } from "@/features/real-ai-search";

export const runtime = "nodejs"; export const dynamic = "force-dynamic";
const schema = z.object({
  provider: z.enum(AI_SEARCH_PROVIDER_TYPES),
  queryId: z.string().trim().min(1).max(128).optional(),
  query: z.string().trim().min(3).max(500).optional(),
  intent: z.enum(["BUYING", "RESEARCH", "COMPARISON", "LOCAL_SEARCH", "TECHNICAL"]).default("RESEARCH"),
}).strict().refine(value => Boolean(value.queryId || value.query), {
  message: "queryId or query is required",
});
function failure(error: unknown) { if (error instanceof RealAISearchError) return NextResponse.json({ error: error.code }, { status: error.status }); return NextResponse.json({ error: "AI_SEARCH_EXECUTION_FAILED" }, { status: 500 }); }
export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) { const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }); try { const { projectId } = await params; return NextResponse.json(await getRealAISearchMonitoring(user.id, projectId)); } catch (error) { return failure(error); } }
export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) { const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }); const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "INVALID_EXECUTION_INPUT" }, { status: 400 }); try { const { projectId } = await params; return NextResponse.json(await executeRealAISearch(user.id, { projectId, ...parsed.data })); } catch (error) { return failure(error); } }

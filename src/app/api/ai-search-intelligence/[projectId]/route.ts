import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/features/auth/server/session";
import { AI_SEARCH_INTENTS, AI_SEARCH_PLATFORMS, AISearchIntelligenceError, createAISearchEvaluation, loadAISearchIntelligence } from "@/features/ai-search-intelligence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({ query: z.string().trim().min(3).max(500), platform: z.enum(AI_SEARCH_PLATFORMS), intent: z.enum(AI_SEARCH_INTENTS) });

export async function GET(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { projectId } = await params;
  const url = new URL(request.url);
  const platformValue = url.searchParams.get("platform");
  const intentValue = url.searchParams.get("intent");
  const platform = AI_SEARCH_PLATFORMS.find((item) => item === platformValue);
  const intent = AI_SEARCH_INTENTS.find((item) => item === intentValue);
  try { return NextResponse.json(await loadAISearchIntelligence(user.id, projectId, { platform, intent })); }
  catch (error) { return intelligenceError(error); }
}

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "INVALID_EVALUATION_INPUT" }, { status: 400 }); }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "INVALID_EVALUATION_INPUT" }, { status: 400 });
  const { projectId } = await params;
  try { return NextResponse.json(await createAISearchEvaluation(user.id, { projectId, ...parsed.data }), { status: 201 }); }
  catch (error) { return intelligenceError(error); }
}

function intelligenceError(error: unknown) {
  if (error instanceof AISearchIntelligenceError) return NextResponse.json({ error: error.code }, { status: error.status });
  if (error instanceof Error && /^AI_SEARCH_EVIDENCE_[A-Z_]+_FAILED$/.test(error.message)) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ error: "AI_SEARCH_INTELLIGENCE_FAILED" }, { status: 500 });
}

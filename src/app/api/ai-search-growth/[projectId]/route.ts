import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/server/session";
import { AISearchGrowthError, calculateAndSaveAISearchGrowth, loadAISearchGrowth } from "@/features/ai-search-growth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function failure(error: unknown) {
  if (error instanceof AISearchGrowthError) return NextResponse.json({ error: error.code }, { status: error.status });
  return NextResponse.json({ error: "AI_SEARCH_GROWTH_FAILED" }, { status: 500 });
}

export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  try { const { projectId } = await params; return NextResponse.json(await loadAISearchGrowth(user.id, projectId)); }
  catch (error) { return failure(error); }
}

export async function POST(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  try { const { projectId } = await params; return NextResponse.json(await calculateAndSaveAISearchGrowth(user.id, projectId), { status: 201 }); }
  catch (error) { return failure(error); }
}

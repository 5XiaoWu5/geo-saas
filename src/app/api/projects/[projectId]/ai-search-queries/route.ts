import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/features/auth/server/session";
import {
  listAISearchQueries,
  RealAISearchError,
  saveAISearchQuery,
} from "@/features/real-ai-search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const saveSchema = z.object({
  query: z.string().trim().min(3).max(500),
  intent: z.enum(["BUYING", "RESEARCH", "COMPARISON", "LOCAL_SEARCH", "TECHNICAL"]),
}).strict();

function failure(error: unknown) {
  if (error instanceof RealAISearchError) {
    return NextResponse.json({ error: error.code }, { status: error.status });
  }
  return NextResponse.json({ error: "AI_SEARCH_QUERY_REQUEST_FAILED" }, { status: 500 });
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  try {
    const { projectId } = await params;
    return NextResponse.json(await listAISearchQueries(user.id, projectId));
  } catch (error) {
    return failure(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const parsed = saveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "AI_SEARCH_QUERY_INPUT_INVALID" }, { status: 400 });
  }
  try {
    const { projectId } = await params;
    const query = await saveAISearchQuery(user.id, projectId, parsed.data);
    return NextResponse.json({ query }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}

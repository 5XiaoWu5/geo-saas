import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/server/session";
import { archiveAISearchQuery, RealAISearchError } from "@/features/real-ai-search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ projectId: string; queryId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  try {
    const { projectId, queryId } = await params;
    return NextResponse.json(await archiveAISearchQuery(user.id, projectId, queryId));
  } catch (error) {
    if (error instanceof RealAISearchError) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }
    return NextResponse.json({ error: "AI_SEARCH_QUERY_ARCHIVE_FAILED" }, { status: 500 });
  }
}

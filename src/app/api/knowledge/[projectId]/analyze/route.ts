import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/server/session";
import { analyzeCompanyKnowledge, KnowledgeServiceError } from "@/features/knowledge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  try {
    const { projectId } = await params;
    return NextResponse.json(await analyzeCompanyKnowledge(user.id, projectId));
  } catch (error) {
    if (error instanceof KnowledgeServiceError) return NextResponse.json({ error: error.code }, { status: error.status });
    return NextResponse.json({ error: "REQUEST_FAILED" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/server/session";
import { confirmDraftProduct, KnowledgeServiceError } from "@/features/knowledge/knowledge.service";
import { analyzeCompanyKnowledge } from "@/features/knowledge/knowledge-intelligence.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ projectId: string; productId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { projectId, productId } = await params;
  try {
    const product = await confirmDraftProduct(user.id, projectId, productId);
    await analyzeCompanyKnowledge(user.id, projectId);
    return NextResponse.json({ product });
  } catch (error) {
    if (error instanceof KnowledgeServiceError) return NextResponse.json({ error: error.code }, { status: error.status });
    throw error;
  }
}

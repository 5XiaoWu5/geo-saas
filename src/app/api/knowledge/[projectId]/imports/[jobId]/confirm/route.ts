import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/features/auth/server/session";
import { confirmExtractedProduct, KnowledgeImportServiceError } from "@/features/knowledge/knowledge-document-intelligence.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const confirmSchema = z.object({ productIndex: z.number().int().min(0).max(99) });

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string; jobId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const parsed = confirmSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "INVALID_PRODUCT_SELECTION" }, { status: 400 });
  try {
    const { projectId, jobId } = await params;
    const result = await confirmExtractedProduct(user.id, projectId, jobId, parsed.data.productIndex);
    return NextResponse.json(result, { status: result.created ? 201 : 200 });
  } catch (error) {
    if (error instanceof KnowledgeImportServiceError) return NextResponse.json({ error: error.code }, { status: error.status });
    return NextResponse.json({ error: "CONFIRM_FAILED" }, { status: 500 });
  }
}

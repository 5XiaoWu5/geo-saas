import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/server/session";
import { KnowledgeImportServiceError, processKnowledgeImport } from "@/features/knowledge/knowledge-document-intelligence.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ projectId: string; jobId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  try {
    const { projectId, jobId } = await params;
    return NextResponse.json({ job: await processKnowledgeImport(user.id, projectId, jobId) });
  } catch (error) {
    if (error instanceof KnowledgeImportServiceError) return NextResponse.json({ error: error.code }, { status: error.status });
    return NextResponse.json({ error: "EXTRACTION_FAILED" }, { status: 500 });
  }
}

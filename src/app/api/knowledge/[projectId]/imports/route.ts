import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/features/auth/server/session";
import { importKnowledgeFile, importKnowledgeWebsite, KnowledgeImportServiceError, listKnowledgeImports } from "@/features/knowledge/knowledge-document-intelligence.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const websiteSchema = z.object({ sourceType: z.literal("WEBSITE_URL"), url: z.string().trim().url() });

export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  try {
    const { projectId } = await params;
    return NextResponse.json(await listKnowledgeImports(user.id, projectId));
  } catch (error) {
    return importErrorResponse(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { projectId } = await params;
  try {
    if (request.headers.get("content-type")?.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");
      if (!(file instanceof File)) return NextResponse.json({ error: "FILE_REQUIRED" }, { status: 400 });
      return NextResponse.json({ job: await importKnowledgeFile(user.id, projectId, file) }, { status: 202 });
    }
    const parsed = websiteSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "INVALID_IMPORT_INPUT" }, { status: 400 });
    return NextResponse.json({ job: await importKnowledgeWebsite(user.id, projectId, parsed.data.url) }, { status: 202 });
  } catch (error) {
    return importErrorResponse(error);
  }
}

function importErrorResponse(error: unknown) {
  if (error instanceof KnowledgeImportServiceError) return NextResponse.json({ error: error.code }, { status: error.status });
  return NextResponse.json({ error: "IMPORT_FAILED" }, { status: 500 });
}

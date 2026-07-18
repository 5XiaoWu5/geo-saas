import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/features/auth/server/session";
import { createKnowledgeBase, KnowledgeServiceError, listKnowledgeProjects } from "@/features/knowledge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({ projectId: z.string().min(1).max(200) }).strict();

function serviceResponse(error: unknown) {
  if (error instanceof KnowledgeServiceError) return NextResponse.json({ error: error.code }, { status: error.status });
  return NextResponse.json({ error: "REQUEST_FAILED" }, { status: 500 });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  try {
    return NextResponse.json(await listKnowledgeProjects(user.id));
  } catch (error) {
    return serviceResponse(error);
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  try {
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "INVALID_KNOWLEDGE_INPUT" }, { status: 400 });
    return NextResponse.json({ knowledgeBase: await createKnowledgeBase(user.id, parsed.data.projectId) }, { status: 201 });
  } catch (error) {
    return serviceResponse(error);
  }
}

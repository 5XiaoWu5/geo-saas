import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/features/auth/server/session";
import { AI_SEARCH_PROVIDER_TYPES, RealAISearchError, testProviderConnection } from "@/features/real-ai-search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const schema = z.object({ provider: z.enum(AI_SEARCH_PROVIDER_TYPES), approvedExternalRequest: z.literal(true) }).strict();

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "PROVIDER_TEST_APPROVAL_REQUIRED" }, { status: 400 });
  try { const { projectId } = await params; return NextResponse.json(await testProviderConnection(user.id, projectId, parsed.data.provider)); }
  catch (error) { if (error instanceof RealAISearchError) return NextResponse.json({ error: error.code }, { status: error.status }); return NextResponse.json({ error: "PROVIDER_TEST_FAILED" }, { status: 500 }); }
}

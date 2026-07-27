import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/features/auth/server/session";
import {
  AI_SEARCH_CONNECTION_TYPES,
  AI_SEARCH_PROVIDER_TYPES,
  RealAISearchError,
  listProviderModels,
} from "@/features/real-ai-search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  provider: z.enum(AI_SEARCH_PROVIDER_TYPES),
  connectionType: z.enum(AI_SEARCH_CONNECTION_TYPES).optional(),
  displayName: z.string().trim().min(1).max(80).nullable().optional(),
  baseUrl: z.string().trim().url().max(2048).nullable().optional(),
  apiKey: z.string().trim().min(8).max(512).optional(),
}).strict();

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_PROVIDER_MODEL_REQUEST" }, { status: 400 });
  try {
    const { projectId } = await params;
    return NextResponse.json(await listProviderModels(user.id, projectId, parsed.data.provider, parsed.data));
  } catch (error) {
    if (error instanceof RealAISearchError) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }
    return NextResponse.json({ error: "PROVIDER_MODEL_LIST_FAILED" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/features/auth/server/session";
import {
  AI_SEARCH_GATEWAY_PROTOCOLS,
  discoverGatewayConnection,
  RealAISearchError,
} from "@/features/real-ai-search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().trim().min(1).max(80),
  baseUrl: z.string().trim().url().max(2048),
  protocol: z.enum(AI_SEARCH_GATEWAY_PROTOCOLS),
  apiKey: z.string().trim().min(8).max(512),
  approvedExternalRequest: z.literal(true),
}).strict();

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "GATEWAY_INPUT_INVALID" }, { status: 400 });
  try {
    const { projectId } = await params;
    return NextResponse.json(await discoverGatewayConnection(user.id, projectId, parsed.data));
  } catch (error) {
    if (error instanceof RealAISearchError) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }
    return NextResponse.json({ error: "GATEWAY_DISCOVERY_FAILED" }, { status: 500 });
  }
}

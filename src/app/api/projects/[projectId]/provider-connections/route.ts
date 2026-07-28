import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/features/auth/server/session";
import {
  AI_SEARCH_GATEWAY_PROTOCOLS,
  AI_SEARCH_MODEL_FAMILIES,
  createGatewayConnection,
  listGatewayConnections,
  RealAISearchError,
} from "@/features/real-ai-search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  baseUrl: z.string().trim().url().max(2048),
  protocol: z.enum(AI_SEARCH_GATEWAY_PROTOCOLS),
  apiKey: z.string().trim().min(8).max(512),
  selectedModels: z.array(z.object({
    modelId: z.string().trim().min(1).max(200),
    family: z.enum(AI_SEARCH_MODEL_FAMILIES),
    isDefault: z.boolean(),
  }).strict()).min(1).max(8),
  approvedPaidVerification: z.literal(true),
}).strict();

function errorResponse(error: unknown) {
  if (error instanceof RealAISearchError) {
    return NextResponse.json({ error: error.code }, { status: error.status });
  }
  return NextResponse.json({ error: "GATEWAY_REQUEST_FAILED" }, { status: 500 });
}

export async function GET(_: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  try {
    const { projectId } = await params;
    return NextResponse.json({ connections: await listGatewayConnections(user.id, projectId) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "GATEWAY_INPUT_INVALID" }, { status: 400 });
  try {
    const { projectId } = await params;
    const connection = await createGatewayConnection(user.id, projectId, parsed.data);
    return NextResponse.json({ connection }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

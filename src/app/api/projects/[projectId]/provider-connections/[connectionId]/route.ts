import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/server/session";
import {
  deleteGatewayConnection,
  RealAISearchError,
} from "@/features/real-ai-search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ projectId: string; connectionId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  try {
    const { projectId, connectionId } = await params;
    return NextResponse.json(await deleteGatewayConnection(user.id, projectId, connectionId));
  } catch (error) {
    if (error instanceof RealAISearchError) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }
    return NextResponse.json({ error: "GATEWAY_DELETE_FAILED" }, { status: 500 });
  }
}

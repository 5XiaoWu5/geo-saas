import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/server/session";
import { aiPresenceApiError } from "@/features/ai-presence/api";
import { runDiscoverabilityCheck } from "@/features/ai-presence/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  try {
    const { projectId } = await params;
    return NextResponse.json(await runDiscoverabilityCheck(user.id, projectId), { status: 201 });
  } catch (error) {
    return aiPresenceApiError(error);
  }
}

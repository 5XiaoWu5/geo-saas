import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/server/session";
import { aiPresenceApiError } from "@/features/ai-presence/api";
import { getAIPresenceSummary } from "@/features/ai-presence/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  try {
    const { projectId } = await params;
    return NextResponse.json(await getAIPresenceSummary(user.id, projectId));
  } catch (error) {
    return aiPresenceApiError(error);
  }
}

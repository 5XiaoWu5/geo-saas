import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/server/session";
import { aiPresenceApiError } from "@/features/ai-presence/api";
import { getAIPresenceTask } from "@/features/ai-presence/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ projectId: string; taskId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  try {
    const { projectId, taskId } = await params;
    return NextResponse.json(await getAIPresenceTask(user.id, projectId, taskId));
  } catch (error) {
    return aiPresenceApiError(error);
  }
}

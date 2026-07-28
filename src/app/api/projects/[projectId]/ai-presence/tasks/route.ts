import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/features/auth/server/session";
import { aiPresenceApiError } from "@/features/ai-presence/api";
import {
  AI_PRESENCE_PLATFORMS,
  declarePlatformSubmission,
  listAIPresenceTasks,
} from "@/features/ai-presence/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const submissionSchema = z.object({
  platform: z.enum(AI_PRESENCE_PLATFORMS.map(item => item.platform) as [typeof AI_PRESENCE_PLATFORMS[number]["platform"], ...Array<typeof AI_PRESENCE_PLATFORMS[number]["platform"]>]),
  taskType: z.enum(AI_PRESENCE_PLATFORMS.map(item => item.taskType) as [typeof AI_PRESENCE_PLATFORMS[number]["taskType"], ...Array<typeof AI_PRESENCE_PLATFORMS[number]["taskType"]>]),
  targetUrl: z.union([z.null(), z.string().trim().url().max(2048)]),
}).strict();

export async function GET(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  try {
    const { projectId } = await params;
    const limit = Number(new URL(request.url).searchParams.get("limit") ?? 50);
    return NextResponse.json({ tasks: await listAIPresenceTasks(user.id, projectId, Number.isFinite(limit) ? limit : 50) });
  } catch (error) {
    return aiPresenceApiError(error);
  }
}
export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  try {
    const [{ projectId }, body] = await Promise.all([params, request.json()]);
    return NextResponse.json(await declarePlatformSubmission(user.id, projectId, submissionSchema.parse(body)), { status: 201 });
  } catch (error) {
    return aiPresenceApiError(error);
  }
}

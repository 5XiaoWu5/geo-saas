import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/server/session";
import { RealAISearchError } from "@/features/real-ai-search";
import { getProjectOnboardingSummary } from "@/features/growth-engine/onboarding-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  try {
    const { projectId } = await params;
    return NextResponse.json(await getProjectOnboardingSummary(user.id, projectId));
  } catch (error) {
    if (error instanceof RealAISearchError) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }
    return NextResponse.json({ error: "ONBOARDING_SUMMARY_FAILED" }, { status: 500 });
  }
}

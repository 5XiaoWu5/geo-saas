import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/server/session";
import { GrowthServiceError } from "@/features/growth/snapshot.service";
import { loadGrowthWorkspace } from "@/features/growth/timeline.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { projectId } = await params;
  const { searchParams } = new URL(request.url);
  try {
    return NextResponse.json(await loadGrowthWorkspace(user.id, projectId, searchParams.get("range")));
  } catch (error) {
    if (error instanceof GrowthServiceError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
}


import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/features/auth/server/session";
import { prisma } from "@/features/auth/server/prisma";
import { InsightEngineError, loadInsightsWorkspace } from "@/features/insights/insight-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const projectId = request.nextUrl.searchParams.get("projectId");
  if (projectId && !await prisma.project.findFirst({ where: { id: projectId, userId: user.id } })) return NextResponse.json({ error: "PROJECT_FORBIDDEN" }, { status: 403 });
  try {
    return NextResponse.json(await loadInsightsWorkspace(user.id, projectId));
  } catch (error) {
    if (error instanceof InsightEngineError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "REQUEST_FAILED" }, { status: 500 });
  }
}


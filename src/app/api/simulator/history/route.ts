import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/server/session";
import { loadSimulatorWorkspace, SimulatorServiceError } from "@/features/ai-search-simulator/simulator.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { searchParams } = new URL(request.url);

  try {
    return NextResponse.json(await loadSimulatorWorkspace(
      user.id,
      searchParams.get("projectId"),
      searchParams.get("campaignId"),
      searchParams.get("queryId"),
    ));
  } catch (error) {
    if (error instanceof SimulatorServiceError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
}


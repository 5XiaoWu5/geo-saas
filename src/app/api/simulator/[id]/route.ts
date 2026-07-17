import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/server/session";
import { loadSimulationDetail, SimulatorServiceError } from "@/features/ai-search-simulator/simulator.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { id } = await params;

  try {
    return NextResponse.json(await loadSimulationDetail(user.id, id));
  } catch (error) {
    if (error instanceof SimulatorServiceError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
}


import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/server/session";
import { runSimulation, SimulatorServiceError } from "@/features/ai-search-simulator/simulator.service";
import type { RunSimulationInput } from "@/features/ai-search-simulator/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  let input: RunSimulationInput;
  try {
    input = await request.json() as RunSimulationInput;
  } catch {
    return NextResponse.json({ error: "INVALID_SIMULATION_INPUT" }, { status: 400 });
  }

  try {
    return NextResponse.json(await runSimulation(user.id, input), { status: 201 });
  } catch (error) {
    if (error instanceof SimulatorServiceError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
}


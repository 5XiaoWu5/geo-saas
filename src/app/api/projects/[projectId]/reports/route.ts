import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/server/session";
import { generateGrowthReport, GrowthReportError, listGrowthReports } from "@/features/growth-reports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function failure(error: unknown) {
  if (error instanceof GrowthReportError) return NextResponse.json({ error: error.code }, { status: error.status });
  console.error("growth_report_api_failed", error);
  return NextResponse.json({ error: "REPORT_REQUEST_FAILED" }, { status: 500 });
}

export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { projectId } = await params;
  try { return NextResponse.json(await listGrowthReports(user.id, projectId)); } catch (error) { return failure(error); }
}

export async function POST(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { projectId } = await params;
  try { return NextResponse.json({ report: await generateGrowthReport(user.id, projectId) }); } catch (error) { return failure(error); }
}

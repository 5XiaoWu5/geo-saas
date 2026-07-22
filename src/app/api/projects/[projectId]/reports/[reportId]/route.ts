import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/server/session";
import { getGrowthReport, GrowthReportError } from "@/features/growth-reports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string; reportId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { projectId, reportId } = await params;
  try { return NextResponse.json({ report: await getGrowthReport(user.id, projectId, reportId) }); }
  catch (error) {
    if (error instanceof GrowthReportError) return NextResponse.json({ error: error.code }, { status: error.status });
    console.error("growth_report_detail_api_failed", error);
    return NextResponse.json({ error: "REPORT_REQUEST_FAILED" }, { status: 500 });
  }
}

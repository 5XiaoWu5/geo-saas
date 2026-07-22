import { GrowthReportDetailView } from "@/features/growth-reports/growth-report-detail";

export default async function GrowthReportDetailPage({ params }: { params: Promise<{ projectId: string; reportId: string }> }) {
  const { projectId, reportId } = await params;
  return <GrowthReportDetailView projectId={projectId} reportId={reportId} />;
}

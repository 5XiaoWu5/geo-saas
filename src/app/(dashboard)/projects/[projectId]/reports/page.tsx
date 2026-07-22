import { GrowthReportList } from "@/features/growth-reports/growth-report-list";

export default async function GrowthReportsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <GrowthReportList projectId={projectId} />;
}

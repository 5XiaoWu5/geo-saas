import type { Project } from "@/types/project";
import { Card, CardContent } from "@/components/ui/card";
import { MetricCard } from "@/components/shared/page";
import { formatDate } from "@/lib/format";

export function ProjectStats({ projects, labels }: { projects: Project[]; labels: { totalProjects: string; totalReports: string; lastAnalysis: string; averageGeoScore: string; mockData: string; allProjects: string; latest: string; fakeScore: string } }) {
  const analyzedDates = projects
    .map((project) => project.lastAnalysisAt)
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime());
  const totalReports = projects.reduce((total, project) => total + project.reportsCount, 0);
  const averageScore = projects.length ? Math.round(projects.reduce((total, project) => total + project.geoScore, 0) / projects.length) : 0;

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard label={labels.totalProjects} value={String(projects.length)} delta={labels.mockData} />
      <MetricCard label={labels.totalReports} value={String(totalReports)} delta={labels.allProjects} />
      <MetricCard label={labels.lastAnalysis} value={formatDate(analyzedDates[0] ?? null)} delta={labels.latest} />
      <MetricCard label={labels.averageGeoScore} value={`${averageScore}%`} delta={labels.fakeScore} />
    </section>
  );
}

export function ProjectEmptyResults({ title, description }: { title: string; description: string }) {
  return (
    <Card className="glass-panel border-white/10">
      <CardContent className="flex min-h-[280px] flex-col items-center justify-center p-8 text-center">
        <div className="mb-4 h-12 w-12 rounded-2xl border border-dashed border-primary/40 bg-primary/10" />
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

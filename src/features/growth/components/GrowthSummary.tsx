import { Activity, CalendarClock, Target, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/i18n/provider";
import { formatDateTime } from "@/lib/format";
import type { GrowthWorkspaceProject } from "../types";

export function GrowthSummary({ project }: { project: GrowthWorkspaceProject }) {
  const { t } = useI18n();
  const items = [
    { icon: Target, label: t("growth.currentScore"), value: project.latestScore === null ? t("growth.unavailable") : `${project.latestScore}` },
    { icon: Activity, label: t("growth.snapshotCount"), value: `${project.snapshotCount}` },
    { icon: TrendingUp, label: t("growth.projectGeoScore"), value: `${project.geoScore}` },
    { icon: CalendarClock, label: t("growth.latestUpdate"), value: project.latestSnapshotAt ? formatDateTime(project.latestSnapshotAt) : t("growth.unavailable") },
  ];
  return <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{items.map(({ icon: Icon, label, value }) => <Card key={label} className="glass-panel min-w-0 border-white/10"><CardContent className="p-5"><Icon className="h-5 w-5 text-primary" /><p className="mt-3 text-sm text-muted-foreground">{label}</p><p className="mt-2 break-words font-mono text-xl font-semibold text-foreground">{value}</p></CardContent></Card>)}</section>;
}


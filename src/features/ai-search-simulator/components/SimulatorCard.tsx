import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useI18n } from "@/i18n/provider";
import type { SimulationRecord } from "../types";
import { ProbabilityGauge } from "./ProbabilityGauge";

export function SimulatorCard({ record }: { record: SimulationRecord }) {
  const { t } = useI18n();
  const result = record.result;
  if (!result) return null;

  const metrics = [
    [t("simulator.entityScore"), result.entityScore],
    [t("simulator.schemaScore"), result.schemaScore],
    [t("simulator.authorityScore"), result.authorityScore],
    [t("simulator.citationScore"), result.citationScore],
  ] as const;

  return (
    <Card className="glass-panel min-w-0 border-white/10">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle className="break-words text-lg">{record.provider}</CardTitle>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{record.query}</p>
        </div>
        <Badge variant={result.mentioned ? "success" : "warning"}>{result.mentioned ? t("simulator.mentioned") : t("simulator.notMentioned")}</Badge>
      </CardHeader>
      <CardContent className="space-y-5">
        <ProbabilityGauge value={result.probability} label={t("simulator.probability")} />
        <div className="grid grid-cols-2 gap-3">
          <Metric label={t("simulator.ranking")} value={result.ranking ? `#${result.ranking}` : "-"} />
          <Metric label={t("simulator.confidence")} value={`${result.confidence}%`} />
        </div>
        <div className="space-y-3">
          {metrics.map(([label, value]) => (
            <div key={label}>
              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground"><span>{label}</span><span className="font-mono text-foreground">{value}</span></div>
              <Progress value={value} className="mt-2" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.03] p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 truncate font-mono text-lg font-semibold text-foreground">{value}</p></div>;
}


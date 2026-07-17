import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/i18n/provider";
import type { GrowthMetricDelta } from "../types";

export function ImprovementCard({ delta }: { delta: GrowthMetricDelta }) {
  const { t } = useI18n();
  const value = delta.change;
  const Icon = value === null || value === 0 ? ArrowRight : value > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <Card className="glass-panel min-w-0 border-white/10">
      <CardContent className="p-4">
        <p className="truncate text-xs text-muted-foreground">{t(`growth.metrics.${delta.key}`)}</p>
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className={value === null ? "font-mono text-xl font-semibold text-muted-foreground" : value >= 0 ? "font-mono text-xl font-semibold text-emerald-400" : "font-mono text-xl font-semibold text-rose-400"}>
            {value === null ? t("growth.unavailable") : `${value > 0 ? "+" : ""}${value}`}
          </span>
          <Icon className={value === null || value === 0 ? "h-5 w-5 text-muted-foreground" : value > 0 ? "h-5 w-5 text-emerald-400" : "h-5 w-5 text-rose-400"} />
        </div>
      </CardContent>
    </Card>
  );
}


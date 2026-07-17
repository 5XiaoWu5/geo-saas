import { CheckCircle2, XCircle } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import type { SimulationSignalCode } from "../types";

type Props = {
  reasons: SimulationSignalCode[];
  missing: SimulationSignalCode[];
};

export function CitationReasons({ reasons, missing }: Props) {
  const { t } = useI18n();
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <SignalList title={t("simulator.recommendationReasons")} items={reasons} positive />
      <SignalList title={t("simulator.missingSignals")} items={missing} positive={false} />
    </div>
  );
}

function SignalList({ title, items, positive }: { title: string; items: SimulationSignalCode[]; positive: boolean }) {
  const { t } = useI18n();
  const Icon = positive ? CheckCircle2 : XCircle;
  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-background/35 p-4">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <div className="mt-3 space-y-2">
        {items.length ? items.map((item) => (
          <div key={item} className="flex min-w-0 items-start gap-2 text-sm">
            <Icon className={positive ? "mt-0.5 h-4 w-4 shrink-0 text-emerald-400" : "mt-0.5 h-4 w-4 shrink-0 text-rose-400"} />
            <span className="break-words text-muted-foreground">{t(`simulator.signals.${item}`)}</span>
          </div>
        )) : <p className="text-sm text-muted-foreground">{t("simulator.noSignals")}</p>}
      </div>
    </div>
  );
}


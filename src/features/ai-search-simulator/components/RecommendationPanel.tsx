import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import type { SimulationResult } from "../types";
import { CitationReasons } from "./CitationReasons";

export function RecommendationPanel({ result }: { result: SimulationResult }) {
  const { t } = useI18n();
  return (
    <Card className="glass-panel border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><Lightbulb className="h-5 w-5 text-primary" /> {t("simulator.recommendationPanel")}</CardTitle>
      </CardHeader>
      <CardContent><CitationReasons reasons={result.reasons} missing={result.missing} /></CardContent>
    </Card>
  );
}


"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import type { PromptTrackingResult } from "@/features/visibility-monitor/types";
import { useI18n } from "@/i18n/provider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function PromptTrackingTable({ results }: { results: PromptTrackingResult[] }) {
  const { t } = useI18n();

  return (
    <Card className="glass-panel border-white/10">
      <CardHeader>
        <CardTitle>{t("visibility.promptTracking")}</CardTitle>
        <p className="text-sm text-muted-foreground">{t("visibility.mockArchitecture")}</p>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <div className="min-w-[980px]">
          <div className="grid grid-cols-12 border-y border-white/10 px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <span className="col-span-3">{t("visibility.userPrompt")}</span><span className="col-span-2">{t("visibility.aiPlatform")}</span><span className="col-span-2">{t("visibility.brandMentioned")}</span><span className="col-span-2">{t("visibility.recommendationPosition")}</span><span className="col-span-3">{t("visibility.reasonAnalysis")}</span>
          </div>
          {results.map((result) => (
            <div key={result.id} className="grid grid-cols-12 items-center gap-3 border-b border-white/5 px-5 py-4 text-sm hover:bg-white/[0.03]">
              <p className="col-span-3 font-medium">{result.prompt}</p>
              <Badge className="col-span-2 w-fit" variant="outline">{result.platform}</Badge>
              <div className="col-span-2 flex items-center gap-2">{result.brandMentioned ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <XCircle className="h-4 w-4 text-destructive" />}{result.brandMentioned ? t("common.yes") : t("common.no")}</div>
              <div className="col-span-2">
                <p>{result.recommendationPosition ? t("visibility.position", { position: result.recommendationPosition }) : t("visibility.notRecommended")}</p>
                <Progress value={result.confidence} className="mt-2" />
              </div>
              <p className="col-span-3 line-clamp-2 text-muted-foreground">{result.reasonAnalysis}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

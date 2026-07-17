"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ClipboardPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/i18n/provider";
import type { CreateInsightTaskResponse, InsightRecommendation } from "../types";

export function RecommendationList({ projectId, recommendations }: { projectId: string; recommendations: InsightRecommendation[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function openRecommendation(recommendation: InsightRecommendation) {
    if (recommendation.existingTask) return router.push(recommendation.deepLink);
    setBusy(recommendation.signalKey);
    setError("");
    try {
      const response = await fetch(`/api/insights/${projectId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ signalKey: recommendation.signalKey }) });
      const payload = await response.json() as CreateInsightTaskResponse & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "REQUEST_FAILED");
      router.push(payload.deepLink);
    } catch (requestError) {
      const code = requestError instanceof Error ? requestError.message : "REQUEST_FAILED";
      const translated = t(`insights.errors.${code}`);
      setError(translated === `insights.errors.${code}` ? code : translated);
    } finally {
      setBusy("");
    }
  }

  return (
    <Card className="glass-panel border-white/10">
      <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><ClipboardPlus className="h-5 w-5 text-primary" /> {t("insights.recommendations")}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {error ? <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
        {!recommendations.length ? <p className="text-sm text-muted-foreground">{t("insights.noRecommendations")}</p> : recommendations.map((recommendation) => (
          <div key={recommendation.signalKey} className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0"><p className="break-words text-sm font-medium text-foreground">{t(`insights.taskCopy.${recommendation.signalKey}.title`)}</p><p className="mt-1 break-words text-xs text-muted-foreground">{t(`insights.taskCopy.${recommendation.signalKey}.recommendation`)}</p></div>
            <Button size="sm" variant={recommendation.existingTask ? "outline" : "default"} className="w-full shrink-0 sm:w-auto" disabled={busy === recommendation.signalKey} onClick={() => void openRecommendation(recommendation)}>
              {busy === recommendation.signalKey ? <Loader2 className="h-4 w-4 animate-spin" /> : recommendation.existingTask ? <ArrowRight className="h-4 w-4" /> : <ClipboardPlus className="h-4 w-4" />}
              {busy === recommendation.signalKey ? t("insights.creatingTask") : recommendation.existingTask ? t("insights.openTask") : t("insights.createTask")}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}


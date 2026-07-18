"use client";

import { Globe2, Loader2, MapPin, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/i18n/provider";
import type { CompetitorProfile } from "../types";

export function CompetitorCard({ competitor, deleting, onDelete }: { competitor: CompetitorProfile; deleting: boolean; onDelete: () => void }) {
  const { t } = useI18n();
  return (
    <Card className="glass-panel min-w-0 border-white/10">
      <CardContent className="p-4">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0"><p className="truncate font-medium text-foreground">{competitor.name}</p><p className="mt-1 flex items-center gap-2 break-all text-sm text-muted-foreground"><Globe2 className="h-4 w-4 shrink-0" />{competitor.domain}</p></div>
          <Badge variant={competitor.status === "ACTIVE" ? "success" : "muted"}>{t(`competitors.statuses.${competitor.status}`)}</Badge>
        </div>
        <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
          <p>{t("competitors.industry")}: {competitor.industry || t("competitors.unavailable")}</p>
          <p className="flex items-center gap-2"><MapPin className="h-4 w-4" />{competitor.region || t("competitors.unavailable")}</p>
        </div>
        <Button type="button" variant="destructive" size="sm" className="mt-4 w-full" disabled={deleting} onClick={onDelete}>{deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}{t("competitors.delete")}</Button>
      </CardContent>
    </Card>
  );
}

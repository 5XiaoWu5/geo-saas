"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import type { CitationGapItem } from "@/features/geo-analyzer/types";
import { useI18n } from "@/i18n/provider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const citationKeys = {
  newsMedia: "analyzer.newsMedia",
  industrySites: "analyzer.industrySites",
  thirdPartyPlatforms: "analyzer.thirdPartyPlatforms",
  customerCases: "analyzer.customerCases",
  authoritativeLinks: "analyzer.authoritativeLinks",
  socialSignals: "analyzer.socialSignals",
};

export function CitationGap({ items }: { items: CitationGapItem[] }) {
  const { t } = useI18n();

  return (
    <Card className="glass-panel border-white/10">
      <CardHeader>
        <CardTitle>{t("analyzer.citationGap")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div key={item.key} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                {item.existing ? <CheckCircle2 className="h-5 w-5 text-emerald-300" /> : <XCircle className="h-5 w-5 text-destructive" />}
                <div>
                  <p className="font-medium">{t(citationKeys[item.key])}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.recommendation}</p>
                </div>
              </div>
              <Badge variant={item.existing ? "success" : "outline"}>{item.existing ? t("analyzer.existing") : t("analyzer.missingSignals")}</Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

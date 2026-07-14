"use client";

import { Sparkles } from "lucide-react";
import { ComingSoon, PageHeader } from "@/components/shared/page";
import { useI18n } from "@/i18n/provider";

export default function AnalyzerPage() {
  const { t } = useI18n();

  return (
    <div>
      <PageHeader title={t("comingSoon.analyzerTitle")} description={t("nav.analyzer")} />
      <ComingSoon
        icon={<Sparkles className="h-6 w-6" />}
        badge={t("comingSoon.badge")}
        title={t("comingSoon.analyzerTitle")}
        description={t("comingSoon.analyzerDescription")}
        featuresLabel={t("comingSoon.featuresLabel")}
        features={[t("comingSoon.analyzerFeature1"), t("comingSoon.analyzerFeature2"), t("comingSoon.analyzerFeature3")]}
      />
    </div>
  );
}

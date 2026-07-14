"use client";

import { BarChart3 } from "lucide-react";
import { ComingSoon, PageHeader } from "@/components/shared/page";
import { useI18n } from "@/i18n/provider";

export default function AnalysisPage() {
  const { t } = useI18n();

  return (
    <div>
      <PageHeader title={t("comingSoon.analysisTitle")} description={t("nav.analysis")} />
      <ComingSoon
        icon={<BarChart3 className="h-6 w-6" />}
        badge={t("comingSoon.badge")}
        title={t("comingSoon.analysisTitle")}
        description={t("comingSoon.analysisDescription")}
        featuresLabel={t("comingSoon.featuresLabel")}
        features={[t("comingSoon.analysisFeature1"), t("comingSoon.analysisFeature2"), t("comingSoon.analysisFeature3")]}
      />
    </div>
  );
}

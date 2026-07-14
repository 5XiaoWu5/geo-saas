"use client";

import { FileText } from "lucide-react";
import { ComingSoon, PageHeader } from "@/components/shared/page";
import { useI18n } from "@/i18n/provider";

export default function ReportsPage() {
  const { t } = useI18n();

  return (
    <div>
      <PageHeader title={t("comingSoon.reportsTitle")} description={t("nav.reports")} />
      <ComingSoon
        icon={<FileText className="h-6 w-6" />}
        badge={t("comingSoon.badge")}
        title={t("comingSoon.reportsTitle")}
        description={t("comingSoon.reportsDescription")}
        featuresLabel={t("comingSoon.featuresLabel")}
        features={[t("comingSoon.reportsFeature1"), t("comingSoon.reportsFeature2"), t("comingSoon.reportsFeature3")]}
      />
    </div>
  );
}

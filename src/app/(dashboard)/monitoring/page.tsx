"use client";

import { Activity } from "lucide-react";
import { ComingSoon, PageHeader } from "@/components/shared/page";
import { useI18n } from "@/i18n/provider";

export default function MonitoringPage() {
  const { t } = useI18n();

  return (
    <div>
      <PageHeader title={t("comingSoon.monitoringTitle")} description={t("nav.monitoring")} />
      <ComingSoon
        icon={<Activity className="h-6 w-6" />}
        badge={t("comingSoon.badge")}
        title={t("comingSoon.monitoringTitle")}
        description={t("comingSoon.monitoringDescription")}
        featuresLabel={t("comingSoon.featuresLabel")}
        features={[t("comingSoon.monitoringFeature1"), t("comingSoon.monitoringFeature2"), t("comingSoon.monitoringFeature3")]}
      />
    </div>
  );
}

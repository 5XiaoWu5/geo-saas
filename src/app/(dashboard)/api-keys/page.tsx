"use client";

import { KeyRound } from "lucide-react";
import { ComingSoon, PageHeader } from "@/components/shared/page";
import { useI18n } from "@/i18n/provider";

export default function ApiKeysPage() {
  const { t } = useI18n();

  return (
    <div>
      <PageHeader title={t("comingSoon.apiKeysTitle")} description={t("nav.apiKeys")} />
      <ComingSoon
        icon={<KeyRound className="h-6 w-6" />}
        badge={t("comingSoon.badge")}
        title={t("comingSoon.apiKeysTitle")}
        description={t("comingSoon.apiKeysDescription")}
        featuresLabel={t("comingSoon.featuresLabel")}
        features={[t("comingSoon.apiKeysFeature1"), t("comingSoon.apiKeysFeature2"), t("comingSoon.apiKeysFeature3")]}
      />
    </div>
  );
}

"use client";

import { Boxes } from "lucide-react";
import { ComingSoon, PageHeader } from "@/components/shared/page";
import { useI18n } from "@/i18n/provider";

export default function InventoryPage() {
  const { t } = useI18n();

  return (
    <div>
      <PageHeader title={t("comingSoon.inventoryTitle")} description={t("nav.siteInventory")} />
      <ComingSoon
        icon={<Boxes className="h-6 w-6" />}
        badge={t("comingSoon.badge")}
        title={t("comingSoon.inventoryTitle")}
        description={t("comingSoon.inventoryDescription")}
        featuresLabel={t("comingSoon.featuresLabel")}
        features={[t("comingSoon.inventoryFeature1"), t("comingSoon.inventoryFeature2"), t("comingSoon.inventoryFeature3")]}
      />
    </div>
  );
}

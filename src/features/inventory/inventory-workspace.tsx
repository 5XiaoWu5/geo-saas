"use client";

import { inventoryAssets, inventoryDashboardStats, inventoryPages, structuredDataInventory } from "@/data/inventory";
import { useI18n } from "@/i18n/provider";
import { PageHeader } from "@/components/shared/page";
import { InventoryDashboard, AssetsOverview, StructuredDataOverview } from "@/features/inventory/inventory-overview";
import { MetaInventoryMatrix } from "@/features/inventory/meta-inventory-matrix";
import { PageInventoryTable } from "@/features/inventory/page-inventory-table";

export function InventoryWorkspace() {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <PageHeader title={t("inventory.title")} description={t("inventory.description")} />
      <InventoryDashboard stats={inventoryDashboardStats} />
      <PageInventoryTable pages={inventoryPages} />
      <section className="grid gap-6 xl:grid-cols-2">
        <AssetsOverview assets={inventoryAssets} />
        <StructuredDataOverview items={structuredDataInventory} />
      </section>
      <MetaInventoryMatrix pages={inventoryPages} />
    </div>
  );
}

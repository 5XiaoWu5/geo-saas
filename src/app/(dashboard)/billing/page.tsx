"use client";

import { EmptyState, PageHeader } from "@/components/shared/page";
import { useI18n } from "@/i18n/provider";

export default function BillingPage() {
  const { t } = useI18n();

  return (
    <div>
      <PageHeader title={t("nav.billing")} description={t("empty.billingDescription")} />
      <EmptyState title={t("empty.billingTitle")} description={t("empty.billingDescription")} />
    </div>
  );
}

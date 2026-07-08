"use client";

import { EmptyState, PageHeader } from "@/components/shared/page";
import { useI18n } from "@/i18n/provider";

export default function HelpPage() {
  const { t } = useI18n();

  return (
    <div>
      <PageHeader title={t("nav.help")} description={t("empty.helpDescription")} />
      <EmptyState title={t("empty.helpTitle")} description={t("empty.helpDescription")} />
    </div>
  );
}

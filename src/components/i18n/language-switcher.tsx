"use client";

import { Languages } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  const nextLocale = locale === "zh" ? "en" : "zh";

  return (
    <Button variant="outline" size="sm" className="border-white/10 bg-white/[0.04]" onClick={() => setLocale(nextLocale)}>
      <Languages className="h-4 w-4" />
      {locale === "zh" ? "中文" : "English"}
    </Button>
  );
}

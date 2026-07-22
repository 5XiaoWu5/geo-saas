"use client";

import { Languages } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useI18n();
  if (compact) {
    return (
      <button
        type="button"
        onClick={() => setLocale(locale === "zh" ? "en" : "zh")}
        className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-xs font-medium text-muted-foreground transition hover:text-foreground"
        aria-label={locale === "zh" ? "Switch to English" : "切换到中文"}
      >
        {locale === "zh" ? "EN" : "中"}
      </button>
    );
  }
  return (
    <div className={cn("hidden min-h-11 items-center rounded-xl border border-white/10 bg-white/[0.04] p-1 sm:flex")} aria-label={locale === "zh" ? "语言切换" : "Language switcher"}>
      <Languages className="mx-1 h-4 w-4 text-muted-foreground" />
      <button type="button" onClick={() => setLocale("zh")} className={cn("min-h-9 rounded-lg px-2 text-xs transition", locale === "zh" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")} aria-pressed={locale === "zh"}>中文</button>
      <span className="text-muted-foreground/50">|</span>
      <button type="button" onClick={() => setLocale("en")} className={cn("min-h-9 rounded-lg px-2 text-xs transition", locale === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")} aria-pressed={locale === "en"}>English</button>
    </div>
  );
}


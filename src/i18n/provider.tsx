"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { defaultLocale, dictionaries, type Dictionary, type Locale } from "@/i18n/dictionaries";

type TranslationKey = string;

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
  dictionary: Dictionary;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function resolveValue(dictionary: Dictionary, key: string): string {
  const value = key.split(".").reduce<unknown>((current, segment) => {
    if (current && typeof current === "object" && segment in current) {
      return (current as Record<string, unknown>)[segment];
    }

    return undefined;
  }, dictionary);

  return typeof value === "string" ? value : key;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(defaultLocale);
  const dictionary = dictionaries[locale];

  const value = useMemo<I18nContextValue>(() => ({
    locale,
    setLocale,
    dictionary,
    t: (key, values) => {
      const template = resolveValue(dictionary, key);
      if (!values) return template;

      return Object.entries(values).reduce((text, [name, replacement]) => text.replaceAll(`{${name}}`, String(replacement)), template);
    },
  }), [dictionary, locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }

  return context;
}

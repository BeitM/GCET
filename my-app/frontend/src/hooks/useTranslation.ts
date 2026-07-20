"use client";

import { useLanguage } from "@/context/LanguageContext";
import { getTranslation, type TranslationValues } from "@/lib/translations";

export function useTranslation() {
  const { language } = useLanguage();

  const t = (key: string, values?: TranslationValues): string =>
    getTranslation(language, key, values);

  return { t, language };
}

"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type Language = "en" | "es" | "fr" | "zh";

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
}

const SUPPORTED_LANGUAGES: Language[] = ["en", "es", "fr", "zh"];
const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    const saved = localStorage.getItem("language") as Language | null;
    if (saved && SUPPORTED_LANGUAGES.includes(saved)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore the user's persisted preference after hydration
      setLanguageState(saved);
      document.documentElement.lang = saved;
      return;
    }

    const browserLanguage = navigator.language.split("-")[0] as Language;
    if (SUPPORTED_LANGUAGES.includes(browserLanguage)) {
      setLanguageState(browserLanguage);
      document.documentElement.lang = browserLanguage;
    }
  }, []);

  const setLanguage = (nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    document.documentElement.lang = nextLanguage;
    localStorage.setItem("language", nextLanguage);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}

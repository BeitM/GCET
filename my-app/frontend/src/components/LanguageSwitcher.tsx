"use client";

import { useLanguage, type Language } from "@/context/LanguageContext";
import { useTranslation } from "@/hooks/useTranslation";

const LANGUAGES: { code: Language; name: string; flag: string }[] = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
];

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();

  return (
    <div className="relative group language-switcher">
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-colors hover:bg-white/10"
        title={t("changeLanguage")}
        aria-label={t("changeLanguage")}
      >
        <span className="text-sm">
          {LANGUAGES.find((item) => item.code === language)?.flag || "🌐"}
        </span>
      </button>
      <div className="invisible opacity-0 group-hover:visible group-focus-within:visible group-hover:opacity-100 group-focus-within:opacity-100 absolute right-0 mt-1 w-32 rounded-lg border border-white/10 bg-[#0d1219] shadow-lg transition-all z-50">
        {LANGUAGES.map((item) => (
          <button
            type="button"
            key={item.code}
            onClick={() => setLanguage(item.code)}
            className={`block w-full px-3 py-2 text-left text-xs transition-colors ${
              language === item.code
                ? "bg-cyan-400/10 font-medium text-cyan-300"
                : "text-white/70 hover:bg-white/10"
            }`}
          >
            <span className="mr-2">{item.flag}</span>
            {item.name}
          </button>
        ))}
      </div>
    </div>
  );
}

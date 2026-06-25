import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { translations, type Lang, type TranslationKey } from "./translations";

type Vars = Record<string, string | number>;

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey, vars?: Vars) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);
const STORAGE_KEY = "ad.lang";

function detectInitialLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "de" || stored === "en") return stored;
  } catch {
    /* localStorage unavailable — fall through */
  }
  const nav = typeof navigator !== "undefined" ? navigator.language.toLowerCase() : "de";
  return nav.startsWith("en") ? "en" : "de";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(detectInitialLang);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* ignore */
    }
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo<I18nContextValue>(
    () => ({
      lang,
      setLang,
      t: (key, vars) => {
        let s = translations[lang][key] ?? translations.de[key] ?? key;
        if (vars) {
          for (const [k, v] of Object.entries(vars)) {
            s = s.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
          }
        }
        return s;
      },
    }),
    [lang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within <I18nProvider>");
  return ctx;
}

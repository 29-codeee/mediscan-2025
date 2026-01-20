"use client";

import { useEffect, useState } from "react";
import { APP_LANG_STORAGE_KEY, type AppLang, t as translate } from "@/lib/i18n";

export function useAppLang() {
  const [lang, setLang] = useState<AppLang>("en-IN");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(APP_LANG_STORAGE_KEY) as AppLang | null;
      if (stored) setLang(stored);
    } catch {
      // ignore
    }
  }, []);

  const setAppLang = (next: AppLang) => {
    setLang(next);
    try {
      localStorage.setItem(APP_LANG_STORAGE_KEY, next);
      document.documentElement.setAttribute("lang", next);
    } catch {
      // ignore
    }
  };

  const t = (key: string) => translate(key, lang);

  return { lang, setAppLang, t };
}



"use client";

import { useEffect } from "react";
import { APP_LANG_STORAGE_KEY, type AppLang } from "@/lib/i18n";

type Props = { children: React.ReactNode };

export default function ClientPreferencesProvider({ children }: Props) {
  useEffect(() => {
    try {
      const largeText = localStorage.getItem("mediscan_accessibility_large_text") === "true";
      const highContrast = localStorage.getItem("mediscan_accessibility_high_contrast") === "true";
      const appLang = (localStorage.getItem(APP_LANG_STORAGE_KEY) as AppLang) || "en-IN";

      const root = document.documentElement;
      root.classList.toggle("mediscan-large-text", largeText);
      root.classList.toggle("mediscan-high-contrast", highContrast);
      root.setAttribute("lang", appLang);
    } catch {
      // ignore
    }
  }, []);

  return children;
}



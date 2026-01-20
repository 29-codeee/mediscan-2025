"use client";

import { useEffect } from "react";

type Props = { children: React.ReactNode };

export default function ClientPreferencesProvider({ children }: Props) {
  useEffect(() => {
    try {
      const largeText = localStorage.getItem("mediscan_accessibility_large_text") === "true";
      const highContrast = localStorage.getItem("mediscan_accessibility_high_contrast") === "true";

      const root = document.documentElement;
      root.classList.toggle("mediscan-large-text", largeText);
      root.classList.toggle("mediscan-high-contrast", highContrast);
    } catch {
      // ignore
    }
  }, []);

  return children;
}



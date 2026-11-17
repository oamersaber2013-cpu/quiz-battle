"use client";

import { useEffect } from "react";

export function useDocumentLocale(language: "en" | "ar") {
  useEffect(() => {
    if (typeof document === "undefined") return;
    const html = document.documentElement;
    const previousLanguage = html.lang;
    const previousDirection = html.dir;

    html.lang = language;
    html.dir = language === "ar" ? "rtl" : "ltr";

    return () => {
      html.lang = previousLanguage;
      html.dir = previousDirection;
    };
  }, [language]);
}

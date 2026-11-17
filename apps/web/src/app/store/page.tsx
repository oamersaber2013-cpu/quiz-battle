"use client";

import Link from "next/link";
import { useDocumentLocale } from "@/hooks/useDocumentLocale";
import { useGameStore } from "@/store/gameStore";

const T = {
  title: { en: "The Royal Treasury", ar: "الخزينة الملكية" },
  unavailable: { en: "Purchases are currently unavailable.", ar: "عمليات الشراء غير متاحة حاليًا." },
  home: { en: "Back to Home", ar: "العودة إلى الرئيسية" },
};

export default function StorePage() {
  const language = useGameStore((state) => state.language);
  useDocumentLocale(language);

  return (
    <main className="page" dir={language === "ar" ? "rtl" : "ltr"} style={{ padding: "40px 20px" }}>
      <div className="container" style={{ maxWidth: 520 }}>
        <div className="glass-card p-8 text-center">
          <h1 className="text-3xl font-black mb-4">{T.title[language]}</h1>
          <p className="text-muted mb-6">{T.unavailable[language]}</p>
          <Link href="/" className="btn btn-primary">
            {T.home[language]}
          </Link>
        </div>
      </div>
    </main>
  );
}

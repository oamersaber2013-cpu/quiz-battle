"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useGameStore } from "@/store/gameStore";
import { useDocumentLocale } from "@/hooks/useDocumentLocale";
import styles from "./Account.module.css";

export function AccountShell({ title, description, children, active }: {
  title: string; description?: string; children: ReactNode; active?: "profile" | "stats";
}) {
  const language = useGameStore(state => state.language);
  const ar = language === "ar";
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  useDocumentLocale(language);
  return <main id="main-content" className={styles.page} aria-busy={!ready} dir={ar ? "rtl" : "ltr"}>
    <div className={styles.container}>
      <div className={styles.topline}>
        <Link href="/" className={styles.brand} aria-label={ar ? "الرئيسية — سيف المعرفة" : "Home — Sword of Knowledge"}><img src="/icon-192.svg" width="28" height="28" alt="" /> {ar ? "سيف المعرفة" : "SWORD OF KNOWLEDGE"}</Link>
      </div>
      <header className={styles.header}>
        <h1>{title}</h1>
        {description && <p className={styles.description}>{description}</p>}
      </header>
      {active && <nav className={styles.tabs} aria-label={ar ? "حساب اللاعب" : "Player account"}>
        <Link href="/profile" aria-current={active === "profile" ? "page" : undefined}>{ar ? "الملف الشخصي" : "Profile"}</Link>
        <Link href="/stats" aria-current={active === "stats" ? "page" : undefined}>{ar ? "الإحصائيات" : "Statistics"}</Link>
        <Link href="/spectate">{ar ? "شاهد المعارك" : "Watch matches"}</Link>
      </nav>}
      {children}
    </div>
  </main>;
}

export function AccountState({ title, children, loading = false, error = false }: {
  title: string; children?: ReactNode; loading?: boolean; error?: boolean;
}) {
  return <section className={`${styles.panel} ${styles.state}`} role={error ? "alert" : loading ? "status" : undefined}>
    {loading && <span className={styles.loadingLine} aria-hidden="true" />}
    <h2>{title}</h2>{children}
  </section>;
}

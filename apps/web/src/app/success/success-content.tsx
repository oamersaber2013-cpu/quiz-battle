"use client";

import Link from "next/link";
import { useGameStore } from "@/store/gameStore";
import { AccountShell } from "@/components/account/AccountShell";
import styles from "@/components/account/Account.module.css";

export function SuccessContent() {
  const language = useGameStore(state => state.language);
  const ar = language === "ar";
  return <AccountShell title={ar ? "حالة الشراء" : "Purchase status"}>
    <section className={`${styles.panel} ${styles.outcome}`}>
      <span className={styles.outcomeMark} aria-hidden="true">i</span>
      <h2>{ar ? "لم يتم تأكيد عملية شراء" : "Purchase not confirmed"}</h2>
      <p className={styles.muted}>{ar ? "عمليات الشراء غير متاحة حاليًا. عد إلى ملفك لمراجعة رصيدك وحالة حسابك." : "Purchases are currently unavailable. Visit your profile to review your balance and account status."}</p>
      <div className={styles.actions}><Link href="/profile" className={styles.primary}>{ar ? "عرض الملف الشخصي" : "View profile"}</Link><Link href="/" className={styles.secondary}>{ar ? "العودة إلى الرئيسية" : "Return home"}</Link><Link href="/store" className={styles.textLink}>{ar ? "حالة المتجر" : "Store status"}</Link></div>
    </section>
  </AccountShell>;
}

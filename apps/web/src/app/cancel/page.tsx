"use client";

import Link from "next/link";
import { useGameStore } from "@/store/gameStore";
import { AccountShell } from "@/components/account/AccountShell";
import styles from "@/components/account/Account.module.css";

export default function CancelPage() {
  const language = useGameStore(state => state.language);
  const ar = language === "ar";
  return <AccountShell title={ar ? "تم إغلاق صفحة الدفع" : "Checkout closed"}>
    <section className={`${styles.panel} ${styles.outcome}`}>
      <span className={styles.outcomeMark} aria-hidden="true">—</span>
      <h2>{ar ? "عد إلى المعركة عندما تكون مستعداً." : "Return to the arena when you are ready."}</h2>
      <p className={styles.muted}>{ar ? "لم يتم تأكيد عملية شراء هنا. يمكنك مراجعة حالة المتجر أو المتابعة إلى اللعبة." : "No purchase has been confirmed here. Check the store status or continue to the game."}</p>
      <div className={styles.actions}><Link href="/" className={styles.primary}>{ar ? "العودة إلى الرئيسية" : "Back to Home"}</Link><Link href="/store" className={styles.secondary}>{ar ? "العودة إلى المتجر" : "Return to store"}</Link></div>
    </section>
  </AccountShell>;
}

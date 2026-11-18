"use client";

import Link from "next/link";
import { useGameStore } from "@/store/gameStore";
import { AccountShell } from "@/components/account/AccountShell";
import styles from "@/components/account/Account.module.css";

export default function StorePage() {
  const language = useGameStore(state => state.language);
  const ar = language === "ar";
  return <AccountShell title={ar ? "الخزينة الملكية" : "The Royal Treasury"}>
    <section className={`${styles.panel} ${styles.paper} ${styles.outcome}`}>
      <h2>{ar ? "عمليات الشراء غير متاحة حاليًا." : "Purchases are currently unavailable."}</h2>
      <p>{ar ? "يمكنك العودة إلى الساحة لإنشاء معركة أو الانضمام إلى الأصدقاء." : "Return to the arena to create a battle or join your friends."}</p>
      <div className={styles.actions}><Link href="/" className={styles.primary}>{ar ? "العودة إلى الرئيسية" : "Back to Home"}</Link></div>
    </section>
  </AccountShell>;
}

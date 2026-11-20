"use client";

import Link from "next/link";
import { AccountShell } from "@/components/account/AccountShell";
import styles from "@/components/account/Account.module.css";
import { useGameStore } from "@/store/gameStore";

export default function NotFound() {
  const ar = useGameStore(state => state.language) === "ar";
  return <AccountShell title={ar ? "الصفحة غير موجودة" : "Page not found"}>
    <Link href="/" className={styles.primary}>{ar ? "العودة إلى اللعبة" : "Return to game"}</Link>
  </AccountShell>;
}

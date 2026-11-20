"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AccountShell } from "@/components/account/AccountShell";
import styles from "@/components/account/Account.module.css";
import { useGameStore } from "@/store/gameStore";

export default function LobbyPage() {
  const gameId = useGameStore(state => state.gameId);
  const ar = useGameStore(state => state.language) === "ar";
  const router = useRouter();
  useEffect(() => {
    if (gameId) router.replace(`/lobby/${encodeURIComponent(gameId)}`);
  }, [gameId, router]);
  return <AccountShell title={gameId
    ? (ar ? "جارٍ فتح غرفة المعركة…" : "Opening your room…")
    : (ar ? "لم تنضم إلى غرفة بعد" : "You haven’t joined a room yet")}>
    {!gameId && <Link className={styles.primary} href="/">{ar ? "إنشاء غرفة أو الانضمام" : "Create or join a room"}</Link>}
  </AccountShell>;
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { connectSocket, subscribeGameRoom } from "@/lib/socket";
import { useGameStore } from "@/store/gameStore";

export function useGameConnection(gameId: string, isSpectating: boolean) {
  const router = useRouter();
  const { userId, username, token, isGuest } = useGameStore();
  const [joining, setJoining] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  // Persisted browser credentials are available after mounting. Avoid sending a
  // player back to the home screen while the server-rendered store is empty.
  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (!hydrated) return;
    if (!userId) {
      router.replace("/");
      return;
    }

    const socket = connectSocket(userId, username, token || undefined, isGuest);
    return subscribeGameRoom(socket, gameId, isSpectating, {
      onJoining: () => setJoining(true),
      onJoined: () => setJoining(false),
      onError: (message) => {
        const store = useGameStore.getState();
        store.addToast("error", message || (store.language === "ar"
          ? "تعذر الاتصال بالمعركة. حاول مرة أخرى."
          : "Unable to connect to the battle. Please try again."));
        router.replace("/");
      },
    });
  }, [gameId, isSpectating, userId, username, token, isGuest, hydrated, router]);

  return { joining };
}

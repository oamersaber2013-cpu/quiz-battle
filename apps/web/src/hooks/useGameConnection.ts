"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { connectSocket, subscribeGameRoom } from "@/lib/socket";
import { useGameStore } from "@/store/gameStore";

export function useGameConnection(gameId: string, isSpectating: boolean) {
  const router = useRouter();
  const { userId, username, token, isGuest } = useGameStore();
  const [joining, setJoining] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordPending, setPasswordPending] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const passwordRef = useRef<string | undefined>(undefined);

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
      onJoining: () => { setJoining(true); setPasswordPending(true); },
      onJoined: () => {
        passwordRef.current = undefined;
        setPasswordRequired(false);
        setPasswordPending(false);
        setJoining(false);
      },
      onError: (message, code) => {
        const store = useGameStore.getState();
        passwordRef.current = undefined;
        setPasswordPending(false);
        if (code === "PASSWORD_REQUIRED" || code === "INVALID_PASSWORD" || code === "RATE_LIMITED") {
          setPasswordRequired(true);
          setPasswordError(code === "INVALID_PASSWORD"
            ? (store.language === "ar" ? "كلمة مرور الغرفة غير صحيحة. حاول مرة أخرى." : "Incorrect room password. Try again.")
            : code === "RATE_LIMITED"
              ? (store.language === "ar" ? "محاولات كثيرة. انتظر دقيقة ثم حاول مرة أخرى." : "Too many attempts. Wait a minute and try again.")
              : null);
          return;
        }
        store.addToast("error", message || (store.language === "ar"
          ? "تعذر الاتصال بالمعركة. حاول مرة أخرى."
          : "Unable to connect to the battle. Please try again."));
        router.replace("/");
      },
    }, { password: passwordRef.current });
  }, [gameId, isSpectating, userId, username, token, isGuest, hydrated, router, attempt]);

  const submitPassword = (password: string) => {
    passwordRef.current = password;
    setPasswordError(null);
    setPasswordPending(true);
    setAttempt((current) => current + 1);
  };

  return { joining, passwordRequired, passwordError, passwordPending, submitPassword };
}

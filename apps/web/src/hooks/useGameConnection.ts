"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { connectSocket, subscribeGameRoom } from "@/lib/socket";
import { useGameStore } from "@/store/gameStore";

export function useGameConnection(gameId: string, isSpectating: boolean) {
  const router = useRouter();
  const { userId, username, token, isGuest } = useGameStore();
  const [joining, setJoining] = useState(true);
  const [joinedRoom, setJoinedRoom] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordPending, setPasswordPending] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const passwordRef = useRef<string | undefined>(undefined);
  const membershipKey = `${gameId}:${userId}:${isSpectating}`;

  // Persisted browser credentials are available after mounting. Avoid sending a
  // player back to the home screen while the server-rendered store is empty.
  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (!hydrated) return;
    if (!userId) {
      const language = useGameStore.getState().language;
      router.replace(`/?room=${encodeURIComponent(gameId)}&lang=${language}${isSpectating ? "&spectate=true" : ""}`);
      return;
    }

    const socket = connectSocket(userId, username, token || undefined, isGuest);
    const unsubscribe = subscribeGameRoom(socket, gameId, isSpectating, {
      onJoining: () => { setJoining(true); setConnectionError(false); setPasswordPending(true); },
      onJoined: () => {
        passwordRef.current = undefined;
        setPasswordRequired(false);
        setPasswordPending(false);
        setJoining(false);
        setJoinedRoom(membershipKey);
        setConnectionError(false);
      },
      onTimeout: () => { setConnectionError(true); setPasswordPending(false); },
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
        const unavailableRoom = message?.trim().toLowerCase() === "game not found";
        store.addToast("error", unavailableRoom ? (store.language === "ar"
          ? "انتهت صلاحية الغرفة أو لم تعد موجودة."
          : "This room has expired or no longer exists.") : message || (store.language === "ar"
          ? "تعذر الاتصال بالمعركة. حاول مرة أخرى."
          : "Unable to connect to the battle. Please try again."));
        router.replace("/");
      },
    }, { password: passwordRef.current });
    return () => {
      unsubscribe();
      // The lobby and battle share a membership. Leaving both routes releases
      // the seat without turning the lobby-to-game handoff into a departure.
      const path = window.location.pathname.replace(/\/$/, "");
      if (socket.connected && path !== `/lobby/${gameId}` && path !== `/game/${gameId}`) {
        socket.emit("game:leave", { gameId });
      }
    };
  }, [gameId, isSpectating, userId, username, token, isGuest, hydrated, router, attempt]);

  const submitPassword = (password: string) => {
    passwordRef.current = password;
    setPasswordError(null);
    setPasswordPending(true);
    setAttempt((current) => current + 1);
  };

  const retryConnection = () => {
    setConnectionError(false);
    setAttempt(current => current + 1);
  };

  const hasJoined = joinedRoom === membershipKey;
  return { joining: !hasJoined, reconnecting: joining && hasJoined, connectionError, retryConnection, passwordRequired, passwordError, passwordPending, submitPassword };
}

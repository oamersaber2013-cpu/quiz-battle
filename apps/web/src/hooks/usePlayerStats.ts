"use client";
import { getApiOrigin } from "@/lib/apiOrigin";

import { useEffect, useState } from "react";
import { useGameStore } from "@/store/gameStore";

interface PlayerStats {
  memberSince: string;
  achievements: { nameEn: string; nameAr: string }[];
  totalGames: number;
  wins: number;
  totalScore: number;
  totalAnswers: number;
  correctAnswers: number;
  history: { id: string; mode: string; endedAt: string; playerCount: number; score: number; rank: number }[];
}

export function usePlayerStats() {
  const token = useGameStore(state => state.token);
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [resource, setResource] = useState<{ token: string; attempt: number; data: PlayerStats | null; needsSignIn?: boolean } | null>(null);

  useEffect(() => setReady(true), []);
  useEffect(() => {
    if (!ready || !token) return;
    const controller = new AbortController();
    let cancelled = false;
    let needsSignIn = false;
    const timeout = setTimeout(() => controller.abort(), 20000);
    const url = getApiOrigin();
    fetch(`${url}/api/user/stats`, {
      headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: controller.signal,
    }).then(async response => {
      needsSignIn = response.status === 401 || response.status === 403;
      if (!response.ok) throw new Error(String(response.status));
      return await response.json() as PlayerStats;
    }).then(data => {
      if (!controller.signal.aborted) setResource({ token, attempt, data });
    }).catch(() => {
      if (!cancelled) setResource({ token, attempt, data: null, needsSignIn });
    }).finally(() => clearTimeout(timeout));
    return () => { cancelled = true; clearTimeout(timeout); controller.abort(); };
  }, [token, ready, attempt]);

  const current = token && resource?.token === token && resource.attempt === attempt ? resource : null;
  return {
    ready, signedIn: Boolean(token), stats: current?.data ?? null,
    failed: current?.data === null, needsSignIn: current?.needsSignIn ?? false, retry: () => setAttempt(value => value + 1),
  };
}

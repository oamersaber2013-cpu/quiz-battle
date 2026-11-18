"use client";

import { useEffect, useState } from "react";
import { getApiOrigin } from "@/lib/apiOrigin";
import { useGameStore } from "@/store/gameStore";

type AdminResult<T> = { data: T; error?: never } | { error: "access" | "network"; data?: never };

export function useAdminResource<T>(path: string) {
  const token = useGameStore(state => state.token);
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [response, setResponse] = useState<{ path: string; token: string; attempt: number; result: AdminResult<T> }>();
  useEffect(() => setReady(true), []);
  useEffect(() => {
    if (!ready || !token) return;
    const controller = new AbortController();
    async function load(auth: string) {
      let result: AdminResult<T>;
      try {
        const res = await fetch(`${getApiOrigin()}/api/admin/${path}`, {
          headers: { Authorization: `Bearer ${auth}` }, cache: "no-store", signal: controller.signal,
        });
        if (res.ok) result = { data: await res.json() };
        else result = { error: [401, 403].includes(res.status) ? "access" : "network" };
      } catch {
        result = { error: "network" };
      }
      if (!controller.signal.aborted) setResponse({ path, token: auth, attempt, result });
    }
    void load(token);
    return () => controller.abort();
  }, [token, ready, path, attempt]);
  const current = response?.path === path && response.token === token && response.attempt === attempt ? response.result : null;
  return { token, loading: !ready || (!!token && !current), data: current?.data, error: ready && !token ? "access" : current?.error, retry: () => setAttempt(n => n + 1) };
}

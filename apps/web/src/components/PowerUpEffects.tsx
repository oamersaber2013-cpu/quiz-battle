"use client";

import { useEffect, useRef, useState } from "react";
import { PowerUpType, type ActivePowerUpEffect } from "@quiz-battle/shared";
import { getServerTime } from "@/lib/gameClock";
import { POWER_UP_INFO } from "./powerUpPresentation";
import styles from "./PowerUpEffects.module.css";

interface PowerUpEffectsProps {
  activeEffects: ActivePowerUpEffect[];
  currentUserId: string;
  language?: "en" | "ar";
  // Kept for older callers. A cosmetic timeout must never remove a server effect.
  onEffectComplete?: (id: string) => void;
}

type Notice = ActivePowerUpEffect & { key: string; id: string };
const NOTICE_DURATION_MS = 2500;

function effectKey(effect: ActivePowerUpEffect): string {
  return JSON.stringify([effect.type, effect.sourceUserId, effect.targetUserId ?? null, effect.expiresAt ?? null]);
}

export function PowerUpEffects({ activeEffects, currentUserId, language = "en" }: PowerUpEffectsProps) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const seen = useRef(new Set<string>());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const sequence = useRef(0);
  const isAr = language === "ar";

  useEffect(() => {
    const current = new Map(activeEffects
      .filter(effect => effect.expiresAt == null || effect.expiresAt > getServerTime())
      .map(effect => [effectKey(effect), effect]));
    const added: Notice[] = [];
    for (const [key, effect] of current) {
      if (seen.current.has(key)) continue;
      const notice = { ...effect, key, id: `power-notice-${++sequence.current}` };
      added.push(notice);
      timers.current.set(key, setTimeout(() => {
        timers.current.delete(key);
        setNotices(previous => previous.filter(item => item.id !== notice.id));
      }, NOTICE_DURATION_MS));
    }
    const removed = [...seen.current].some(key => !current.has(key));
    for (const [key, timer] of timers.current) {
      if (!current.has(key)) {
        clearTimeout(timer);
        timers.current.delete(key);
      }
    }
    seen.current = new Set(current.keys());
    if (added.length || removed) {
      const addedKeys = new Set(added.map(item => item.key));
      setNotices(previous => [...previous.filter(item => current.has(item.key) && !addedKeys.has(item.key)), ...added].slice(-2));
    }
  }, [activeEffects]);

  useEffect(() => () => {
    timers.current.forEach(clearTimeout);
    timers.current.clear();
    seen.current.clear();
  }, []);

  return <div className={styles.layer} dir={isAr ? "rtl" : "ltr"} aria-live="polite" aria-atomic="false">
    {notices.map(effect => {
      const info = POWER_UP_INFO[effect.type];
      const targeted = effect.targetUserId === currentUserId;
      const source = effect.sourceUserId === currentUserId;
      return <div key={effect.id} className={styles.notice} data-power-notice={effect.type} role="status">
        <span className={styles.icon} aria-hidden="true">{info.icon}</span>
        <div>
          <strong>{info.label[language]}</strong>
          <p>{targeted ? (isAr ? "استخدمت هذه القدرة ضدك" : "This power was used on you")
            : source ? (isAr ? "استخدمت هذه القدرة" : "You used this power")
              : (isAr ? "استخدم لاعب هذه القدرة" : "A player used this power")}</p>
        </div>
      </div>;
    })}
  </div>;
}

// For callers that manage their own visual effects instead of server state.
export function usePowerUpEffects() {
  const [effects, setEffects] = useState<(ActivePowerUpEffect & { id: string; duration: number })[]>([]);
  const sequence = useRef(0);
  const addEffect = (type: PowerUpType, sourceUserId: string, targetUserId?: string) => {
    const duration = type === PowerUpType.Freeze || type === PowerUpType.Sandstorm ? 5000 : 3000;
    setEffects(previous => [...previous, { id: `local-power-${++sequence.current}`, type, sourceUserId, targetUserId, duration }]);
  };
  const removeEffect = (id: string) => setEffects(previous => previous.filter(effect => effect.id !== id));
  return { effects, addEffect, removeEffect };
}

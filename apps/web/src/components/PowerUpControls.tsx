"use client";
import { useEffect, useId, useRef, useState } from "react";
import { GAME_MODE_CONFIG, GameMode, GameStatus, PowerUpType } from "@quiz-battle/shared";
import { getServerTime } from "@/lib/gameClock";
import { emitPowerUp, getSocket } from "@/lib/socket";
import { useGameStore } from "@/store/gameStore";
import { POWER_UP_INFO } from "./powerUpPresentation";
import styles from "./ActiveExperience.module.css";

export function PowerUpControls({ isSpectating = false, disabled = false }: { isSpectating?: boolean; disabled?: boolean }) {
  const { gameId, mode, language, currentPlayer, currentQuestion, players, userId, status, timeLeft, activeEffects, customSettings } = useGameStore();
  const [targetPower, setTargetPower] = useState<PowerUpType | null>(null);
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const pickerRef = useRef<HTMLElement>(null);
  const pickerTitle = useId();
  const ar = language === "ar";
  const isFrozen = activeEffects.some(effect => effect.type === PowerUpType.Freeze && effect.targetUserId === userId && (!effect.expiresAt || effect.expiresAt > getServerTime()));
  const canUse = !disabled && !isSpectating && !sending && status === GameStatus.Question && timeLeft > 0 && !currentPlayer?.isEliminated && !isFrozen;
  const targets = players.filter(player => player.userId !== userId && !player.isEliminated && player.isConnected);
  const noTargets = ar ? "لا توجد أهداف متاحة الآن." : "No live targets right now.";

  useEffect(() => { setTargetPower(null); }, [status, currentQuestion?.id, currentPlayer?.isEliminated]);
  useEffect(() => { if (targetPower && !currentPlayer?.powerUpInventory.includes(targetPower)) setTargetPower(null); }, [targetPower, currentPlayer?.powerUpInventory]);
  useEffect(() => { if (targetPower) pickerRef.current?.focus(); }, [targetPower]);

  function maySend(type: PowerUpType) {
    const state = useGameStore.getState();
    return !disabled && !isSpectating && !sendingRef.current && getSocket().connected && state.gameId === gameId &&
      state.status === GameStatus.Question && state.timeLeft > 0 && !state.currentPlayer?.isEliminated &&
      !!state.currentPlayer?.powerUpInventory.includes(type) && !POWER_UP_INFO[type].unavailable &&
      !state.activeEffects.some(effect => effect.type === PowerUpType.Freeze && effect.targetUserId === state.userId && (!effect.expiresAt || effect.expiresAt > getServerTime()));
  }

  async function activate(type: PowerUpType, targetUserId?: string) {
    if (!gameId || !maySend(type)) return;
    if (POWER_UP_INFO[type].needsTarget && !useGameStore.getState().players.some(player => player.userId === targetUserId && player.userId !== userId && player.isConnected && !player.isEliminated)) {
      useGameStore.getState().addToast("info", noTargets); return;
    }
    sendingRef.current = true; setSending(true);
    try {
      const result = await emitPowerUp(gameId, type, targetUserId);
      if (!result.success) throw new Error(result.error);
      setTargetPower(null);
    } catch {
      useGameStore.getState().addToast("error", ar ? "تعذر تفعيل القوة. حاول مرة أخرى." : "Unable to activate this power. Please try again.");
    } finally { sendingRef.current = false; setSending(false); }
  }

  function choose(type: PowerUpType) {
    if (!maySend(type)) return;
    if (POWER_UP_INFO[type].needsTarget) {
      if (!targets.length) { useGameStore.getState().addToast("info", noTargets); return; }
      setTargetPower(type);
    } else { void activate(type); }
  }

  if (!gameId || !currentPlayer || !mode || !GAME_MODE_CONFIG[mode].hasPowerUps ||
      (mode === GameMode.Custom && customSettings?.enabledPowerUps.length === 0)) return null;
  const inventory = currentPlayer.powerUpInventory;
  return <section className={styles.toolStrip} aria-label={ar ? "القوى الخارقة" : "Power-Ups"}>
    <h2 className={styles.sectionHeading}>{ar ? "القوى الخارقة" : "Power-Ups"}<small>{inventory.length} {ar ? "متاحة" : "available"}</small></h2>
    {!inventory.length && <p className="text-muted" role="status">{ar ? "استخدمت جميع قواك المختارة." : "You have used all your selected powers."}</p>}
    <div className={styles.toolGrid}>{inventory.map((type, index) => {
      const info = POWER_UP_INFO[type];
      return <button type="button" key={`${type}-${index}`} className={`powerup-card ${styles.powerControl}`} title={info.description[language]}
        disabled={!canUse || !!info.unavailable} onClick={() => choose(type)}>
        <span className={styles.powerControlIcon} aria-hidden="true">{info.icon}</span>
        <span className={styles.powerControlBody}><strong>{info.label[language]}</strong><span>{info.description[language]}</span>
          {info.needsTarget && <small>{ar ? "اختر خصمًا عند الاستخدام" : "Choose an opponent when used"}</small>}</span>
      </button>;
    })}</div>
    {targetPower && <section ref={pickerRef} tabIndex={-1} className={styles.powerTargetPicker} aria-labelledby={pickerTitle}
      onKeyDown={event => { if (event.key === "Escape") setTargetPower(null); }}>
      <div className={styles.sectionHeading}><h3 id={pickerTitle}>{ar ? "اختر هدفك" : "Choose your target"}</h3>
        <button type="button" className="btn btn-ghost" disabled={sending} onClick={() => setTargetPower(null)}>{ar ? "إلغاء" : "Cancel"}</button></div>
      <p>{POWER_UP_INFO[targetPower].description[language]}</p>
      {!targets.length ? <p role="status">{noTargets}</p> : <div className={styles.powerTargetGrid}>{targets.map(player =>
        <button type="button" className="btn btn-secondary" key={player.userId} disabled={!canUse} onClick={() => activate(targetPower, player.userId)}><bdi>{player.username}</bdi></button>)}</div>}
    </section>}
  </section>;
}

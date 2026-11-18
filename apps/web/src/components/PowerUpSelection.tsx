"use client";
import { useState, useEffect, useCallback } from "react";
import { PowerUpType } from "@quiz-battle/shared";
import { useGameStore } from "../store/gameStore";
import { getSocket } from "../lib/socket";
import { POWER_UP_INFO } from "./powerUpPresentation";
import styles from "./ActiveExperience.module.css";

export function PowerUpSelection({ isSpectating = false }: { isSpectating?: boolean }) {
  const {
    powerUpSelection,
    selectPowerUp,
    confirmPowerUpSelection,
    language,
    gameId,
    players,
    userId,
  } = useGameStore();

  const [timeLeft, setTimeLeft] = useState(powerUpSelection.timeLeft);
  const [confirmed, setConfirmed] = useState(isSpectating || !powerUpSelection.isSelecting);
  const [otherSelections, setOtherSelections] = useState<Record<string, PowerUpType[]>>({});

  const socket = getSocket();
  const isAr = language === "ar";

  // Countdown timer - auto-confirm when time runs out (even with 0 selections)
  useEffect(() => {
    if (timeLeft <= 0 || confirmed) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Auto-confirm with whatever is selected (can be empty)
          if (!confirmed) {
            setConfirmed(true);
            confirmPowerUpSelection();
            socket.emit("game:confirmPowerUpSelection", { gameId: gameId! });
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, confirmed, confirmPowerUpSelection, socket, gameId]);

  // Listen for other players' selections
  useEffect(() => {
    const handlePowerUpSelected = ({ userId: playerId, powerUp }: { userId: string; powerUp: PowerUpType }) => {
      setOtherSelections((prev) => ({
        ...prev,
        [playerId]: [...(prev[playerId] || []), powerUp],
      }));
    };

    socket.on("game:powerUpSelected", handlePowerUpSelected);
    return () => {
      socket.off("game:powerUpSelected", handlePowerUpSelected);
    };
  }, [socket]);

  const handleSelect = useCallback(
    (powerUp: PowerUpType) => {
      if (confirmed || POWER_UP_INFO[powerUp].unavailable) return;

      const current = powerUpSelection.selectedPowerUps;
      const exists = current.includes(powerUp);

      if (!exists && current.length >= powerUpSelection.maxSelections) {
        return; // Max reached
      }

      // Update local state
      selectPowerUp(powerUp);

      // Notify server
      socket.emit("game:selectPowerUp", { gameId: gameId!, powerUp });
    },
    [confirmed, powerUpSelection.selectedPowerUps, powerUpSelection.maxSelections, selectPowerUp, socket, gameId]
  );

  const handleConfirm = useCallback(() => {
    if (confirmed) return;
    setConfirmed(true);
    confirmPowerUpSelection();
    socket.emit("game:confirmPowerUpSelection", { gameId: gameId! });
  }, [confirmed, confirmPowerUpSelection, socket, gameId]);

  if (isSpectating) return <section className={styles.forge} aria-labelledby="power-spectating-title">
    <p className={styles.eyebrow}>{isAr ? "المشاهدة" : "Spectating"}</p>
    <h1 id="power-spectating-title" className={styles.heading}>{isAr ? "يختار اللاعبون قواهم" : "Players are choosing their powers"}</h1>
    <p className={styles.lede} role="status">{isAr ? "تبدأ المعركة بعد اكتمال الاختيارات." : "The battle begins when choices are complete."}</p>
  </section>;

  return (
    <section className={styles.forge} aria-labelledby="power-selection-title">
      <header className={styles.forgeHeading}>
        <div>
          <p className={styles.eyebrow}>{isAr ? "الاستعداد للمعركة" : "Prepare for battle"}</p>
          <h1 id="power-selection-title" className={styles.heading}>{confirmed ? (isAr ? "قواك جاهزة" : "Your powers are ready") : (isAr ? "اختر قواك" : "Choose your powers")}</h1>
          <p className={styles.lede}>{confirmed
            ? (isAr ? "في انتظار بقية اللاعبين..." : "Waiting for other players...")
            : (isAr ? `اختر حتى ${powerUpSelection.maxSelections} قدرات. يمكنك تغيير اختيارك قبل التأكيد.` : `Choose up to ${powerUpSelection.maxSelections} powers. You can change them before confirming.`)}</p>
        </div>
        <div className={styles.forgeTimer} role="timer" aria-label={isAr ? "ثوانٍ متبقية للاختيار" : "Seconds left to choose"}><strong>{timeLeft}</strong> {isAr ? "ث" : "s"}</div>
      </header>
      <div className={styles.forgeGrid} role="group" aria-labelledby="power-selection-title">
        {powerUpSelection.availablePowerUps.map(powerUp => {
          const info = POWER_UP_INFO[powerUp];
          const selected = powerUpSelection.selectedPowerUps.includes(powerUp);
          const canSelect = !confirmed && !info.unavailable && (selected || powerUpSelection.selectedPowerUps.length < powerUpSelection.maxSelections);
          return <button type="button" key={powerUp} className={styles.powerChoice} disabled={!canSelect} aria-pressed={selected} onClick={() => handleSelect(powerUp)}>
            <span className={styles.powerIcon} aria-hidden="true">{info.icon}</span>
            <strong>{info.label[language]} {selected && <span aria-hidden="true">✓</span>}</strong>
            <p>{info.description[language]}</p>
            <span className={styles.powerMeta}>{info.unavailable ? (isAr ? "غير متاحة" : "Unavailable") : info.needsTarget ? (isAr ? "تختار خصمًا عند الاستخدام" : "Choose an opponent when used") : (isAr ? "تستخدمها لنفسك" : "Use for yourself")}</span>
          </button>;
        })}
      </div>
      <footer className={styles.forgeFooter}>
        <p><strong>{powerUpSelection.selectedPowerUps.length} / {powerUpSelection.maxSelections} {isAr ? "قدرات مختارة" : "powers selected"}</strong>
          {powerUpSelection.selectedPowerUps.map(power => POWER_UP_INFO[power].label[language]).join(isAr ? "، " : ", ") || (isAr ? "اختر قدرة للبدء." : "Choose a power to begin.")}
        </p>
        <button type="button" className="btn btn-primary" onClick={handleConfirm} disabled={confirmed || powerUpSelection.selectedPowerUps.length === 0}>
          {confirmed ? (isAr ? "✓ تم التأكيد" : "✓ Confirmed") : (isAr ? "تأكيد الاختيار" : "Confirm selection")}
        </button>
      </footer>
      {players.length > 1 && <div className={styles.tagRow} aria-label={isAr ? "اختيارات اللاعبين" : "Player choices"}>
        {players.filter(player => player.userId !== userId && !player.isBot).map(player => <span className={styles.tag} key={player.userId}><bdi>{player.username}</bdi> · {(otherSelections[player.userId] || powerUpSelection.allSelections[player.userId] || []).length} {isAr ? "مختارة" : "selected"}</span>)}
      </div>}
    </section>
  );
}

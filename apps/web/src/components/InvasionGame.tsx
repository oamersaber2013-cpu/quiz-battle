"use client";

import { useRef } from "react";
import { useGameStore } from "@/store/gameStore";
import { emitInvasionSelectTerritory } from "@/lib/socket";
import { WorldMap } from "./WorldMap";
import styles from "./ConquestGame.module.css";

const colors = ["#fb7185", "#60a5fa", "#4ade80", "#facc15", "#c084fc", "#fdba74", "#67e8f9", "#f9a8d4"];

export function InvasionGame({ onAnswer, isSpectating }: {
  onAnswer: (index: number) => void;
  isSpectating: boolean;
}) {
  const { invasionState, userId, gameId, players, language, currentQuestion, timeLeft, selectedAnswer } = useGameStore();
  const lastPick = useRef({ turn: "", time: 0 });
  const ar = language === "ar";
  if (!invasionState) return <p role="status">{ar ? "جارٍ تحميل الغزو…" : "Loading invasion…"}</p>;
  const { territories, phase, currentRound, totalRounds, lastRanking, currentTurn, picksRemaining, selectableTerritories } = invasionState;
  const playerColors = Object.fromEntries(players.map((p, index) => [p.userId, colors[index % colors.length]]));
  const ownerById = Object.fromEntries(territories.map(t => [t.id, t.ownerId]));
  const troops = Object.fromEntries(territories.map(t => [t.id, t.troopCount]));
  const mine = !isSpectating && userId === currentTurn && phase === "selection" && picksRemaining > 0;
  const turnKey = `${gameId}/${currentRound}/${currentTurn}/${picksRemaining}`;
  function pick(id: string) {
    if (!gameId || !mine || !selectableTerritories.includes(Number(id))) return;
    const now = performance.now();
    if (lastPick.current.turn === turnKey && now - lastPick.current.time < 1200) return;
    lastPick.current = { turn: turnKey, time: now };
    emitInvasionSelectTerritory(gameId, Number(id));
  }
  const name = (id: string | null) => players.find(p => p.userId === id)?.username ?? (ar ? "اللاعب" : "Player");
  const phaseText = {
    question: ar ? "الغزو" : "Invasion", ranking: ar ? "ترتيب الجولة" : "Round ranking",
    selection: ar ? "اختيار الأقاليم" : "Territory selection", ended: ar ? "انتهى الغزو" : "Invasion complete",
  }[phase];
  const map = <WorldMap territories={ownerById} playerColors={playerColors} fortTerritoryId={{}}
    language={language} currentPlayerId={userId ?? ""} phase="invasion_selection" troops={troops}
    availableTerritories={selectableTerritories.map(String)} isMyTurn={mine} onTerritoryClick={pick} />;
  return (
    <div className={styles.root}>
      <section className={styles.questionCard} aria-label={phaseText}>
        <header className={styles.questionMeta}>
          <strong>{phaseText} · {ar ? "الجولة" : "Round"} <bdi>{currentRound} / {totalRounds}</bdi></strong>
          {phase === "question" && <span className={styles.timer} aria-label={ar ? "الثواني المتبقية" : "Seconds remaining"}>{timeLeft}</span>}
        </header>
        {phase === "question" && currentQuestion && <>
          <h2 className={styles.question} id="invasion-question">{currentQuestion.text}</h2>
          <div className={styles.answers} role="group" aria-labelledby="invasion-question">
            {currentQuestion.options?.map((option, index) => <button key={index} type="button" className={`${styles.answer} ${selectedAnswer === index ? styles.selectedAnswer : ""}`}
              disabled={isSpectating || selectedAnswer !== null || timeLeft <= 0}
              aria-pressed={selectedAnswer === index} onClick={() => onAnswer(index)}>{option}</button>)}
          </div>
          {selectedAnswer !== null && <p role="status">{ar ? "تم تسجيل إجابتك" : "Your answer is recorded"}</p>}
        </>}
        {phase === "ranking" && <ol>{lastRanking.map(row => <li key={row.playerId}>{name(row.playerId)} · {row.picks} {ar ? "اختيارات" : "picks"}</li>)}</ol>}
        {phase === "selection" && <p role="status">{mine
          ? (ar ? "دورك. اختر إقليماً من الخريطة أو القائمة." : "Your turn. Choose a territory on the map or from the list.")
          : (ar ? `يختار ${name(currentTurn)} إقليماً.` : `${name(currentTurn)} is choosing a territory.`)}</p>}
        {mine && <div className={styles.territoryChoices}>
          {territories.filter(t => selectableTerritories.includes(t.id)).map(t => (
            <button type="button" key={t.id} onClick={() => pick(String(t.id))}>
              {ar ? t.nameAr : t.name} · {t.troopCount} {ar ? "جندي" : "troops"}
            </button>
          ))}
        </div>}
      </section>
      {phase === "question" ? <details className={styles.mapDetails}>
        <summary>{ar ? "خريطة الغزو" : "Invasion map"}</summary>{map}
      </details> : map}
      <div className={styles.players}>
        {players.map(p => {
          const owned = territories.filter(t => t.ownerId === p.userId);
          return <div className={styles.player} key={p.userId} style={{ borderColor: playerColors[p.userId] }}>
            <strong>{p.username}</strong>
            <span>{owned.length} {ar ? "أقاليم" : "territories"}</span>
            <span>{owned.reduce((sum, t) => sum + t.troopCount, 0)} {ar ? "جندي" : "troops"}</span>
          </div>;
        })}
      </div>
    </div>
  );
}

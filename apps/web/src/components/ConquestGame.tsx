"use client";
import { getServerTime } from "@/lib/gameClock";

import { useEffect, useRef, useState } from "react";
import { useGameStore } from "@/store/gameStore";
import {
  emitConquestAttack,
  emitConquestRebuild,
  getSocket,
} from "@/lib/socket";
import { WorldMap, TERRITORIES } from "./WorldMap";
import styles from "./ConquestGame.module.css";

const PLAYER_COLORS = [
  "#fb7185",
  "#60a5fa",
  "#4ade80",
  "#facc15",
  "#c084fc",
  "#f472b6",
  "#fb923c",
  "#22d3ee",
];

export function ConquestGame() {
  const { conquestState, gameId, language } = useGameStore();
  if (!conquestState)
    return (
      <p role="status">
        {language === "ar" ? "جارٍ تحميل المعركة..." : "Loading the battle..."}
      </p>
    );
  const questionId =
    conquestState.currentBattle?.question.id ??
    conquestState.rebuildSession?.question.id ??
    conquestState.draftPhase?.question?.id;
  const turnKey =
    conquestState.draftPhase?.pickTurnId ?? conquestState.currentTurnIndex;
  return (
    <ConquestBoard
      key={`${gameId}:${conquestState.phase}:${conquestState.draftPhase?.currentRound}:${questionId}:${turnKey}`}
    />
  );
}

function ConquestBoard() {
  const { conquestState, userId, language, players, gameId, addToast } =
    useGameStore();
  const state = conquestState!;
  const { phase, draftPhase, currentBattle, rebuildSession } = state;
  const isAr = language === "ar";
  const participant =
    players.some((player) => player.userId === userId) &&
    !state.eliminatedPlayers.includes(userId ?? "");
  const pickerId = draftPhase?.pickOrder[draftPhase.currentPickerIndex];
  const turnPlayerId =
    phase === "draft_selection"
      ? pickerId
      : state.turnOrder[state.currentTurnIndex];
  const isMyTurn = participant && turnPlayerId === userId;
  const isBattling =
    currentBattle?.attackerId === userId ||
    currentBattle?.defenderId === userId;
  const isRebuilding = rebuildSession?.playerId === userId;
  const question =
    currentBattle?.question ??
    rebuildSession?.question ??
    (phase === "draft" ? draftPhase?.question : null);
  const questionKey = `${gameId}:${phase}:${draftPhase?.currentRound}:${question?.id}`;
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [submission, setSubmission] = useState<{
    index: number;
    pending: boolean;
  } | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [now, setNow] = useState(getServerTime);
  const mountedAt = useRef(getServerTime());
  const answerLocked = useRef(false);
  const actionLocked = useRef(false);
  const active = useRef(true);
  const answerRequestId = useRef(0);
  const requestTimeout = useRef<ReturnType<typeof setTimeout>>();
  const questionStartedAt =
    (phase === "draft" ? draftPhase?.questionStartedAt : undefined) ??
    mountedAt.current;
  const questionEndsAt =
    (phase === "draft" ? draftPhase?.questionEndsAt : undefined) ??
    questionStartedAt + (question?.timeLimit ?? 30) * 1000;
  const deadline =
    phase === "draft_selection"
      ? draftPhase?.pickEndsAt
      : question
        ? questionEndsAt
        : undefined;
  const secondsLeft = deadline
    ? Math.max(0, Math.ceil((deadline - now) / 1000))
    : null;
  const selectedAnswer =
    phase === "draft"
      ? (draftPhase?.selectedAnswer ?? submission?.index)
      : submission?.index;
  const serverAnswered =
    phase === "draft"
      ? draftPhase?.selectedAnswer != null || draftPhase?.answeredAt != null
      : currentBattle
        ? currentBattle.attackerId === userId
          ? currentBattle.attackerAnswered
          : currentBattle.defenderAnswered
        : Boolean(isRebuilding && rebuildSession?.answered);
  const answered = serverAnswered || submission !== null;
  const canAnswer =
    participant &&
    (phase === "draft" || isBattling || isRebuilding) &&
    !answered &&
    secondsLeft !== 0;
  const colorFor = (id: string) =>
    PLAYER_COLORS[
      Math.max(
        0,
        players.findIndex((player) => player.userId === id),
      ) % PLAYER_COLORS.length
    ];
  const playerName = (id?: string) =>
    players.find((player) => player.userId === id)?.username ??
    (isAr ? "اللاعب" : "the player");
  const territoryName = (id: string) => {
    const territory = TERRITORIES.find((item) => item.id === id);
    return (isAr ? territory?.nameAr : territory?.name) ?? id;
  };

  useEffect(() => {
    active.current = true;
    const timer = setInterval(() => setNow(getServerTime()), 250);
    return () => {
      active.current = false;
      clearInterval(timer);
      clearTimeout(requestTimeout.current);
    };
  }, []);

  const showActionError = () =>
    addToast(
      "error",
      isAr
        ? "تعذر إتمام الطلب. حاول مرة أخرى."
        : "The request failed. Please try again.",
    );

  function handleAnswer(index: number) {
    if (!gameId || !question || !canAnswer || answerLocked.current) return;
    answerLocked.current = true;
    setSubmission({ index, pending: phase === "draft" });
    if (phase === "draft") {
      const requestId = ++answerRequestId.current;
      const finish = (success: boolean) => {
        if (!active.current || answerRequestId.current !== requestId) return;
        answerRequestId.current++;
        clearTimeout(requestTimeout.current);
        const latest = useGameStore.getState();
        const draft = latest.conquestState?.draftPhase;
        const latestKey = `${latest.gameId}:${latest.conquestState?.phase}:${draft?.currentRound}:${draft?.question?.id}`;
        if (latestKey !== questionKey) return;
        if (!success) {
          if (draft?.selectedAnswer != null) {
            setSubmission({ index: draft.selectedAnswer, pending: false });
            return;
          }
          answerLocked.current = false;
          setSubmission(null);
          showActionError();
          return;
        }
        if (latest.conquestState && draft) {
          latest.setConquestState({
            ...latest.conquestState,
            draftPhase: {
              ...draft,
              selectedAnswer: index,
              answeredAt: getServerTime(),
            },
          });
        }
        setSubmission({ index, pending: false });
      };
      requestTimeout.current = setTimeout(() => finish(false), 5000);
      getSocket().emit(
        "conquest:draftAnswer",
        {
          gameId,
          answerIndex: index,
          responseTimeMs: Math.max(0, getServerTime() - questionStartedAt),
          questionId: question.id,
          round: draftPhase!.currentRound,
        },
        (response) => finish(response.success),
      );
    } else if (isBattling) {
      getSocket().emit("conquest:duelAnswer", { gameId, answerIndex: index });
    } else if (isRebuilding) {
      getSocket().emit("conquest:rebuildAnswer", {
        gameId,
        answerIndex: index,
      });
    }
  }

  function handleTerritoryClick(territoryId: string) {
    if (!gameId || !isMyTurn || actionLocked.current) return;
    if (phase !== "draft_selection") {
      if (
        phase === "select_target" &&
        state.territories[territoryId] !== userId
      )
        setSelectedTarget(territoryId);
      return;
    }
    if (
      !draftPhase?.availableTerritories.includes(territoryId) ||
      secondsLeft === 0
    )
      return;
    actionLocked.current = true;
    setActionPending(true);
    requestTimeout.current = setTimeout(() => {
      if (!active.current) return;
      actionLocked.current = false;
      setActionPending(false);
      showActionError();
    }, 5000);
    getSocket().emit(
      "conquest:selectDraftTerritory",
      { gameId, territoryId, turnId: draftPhase.pickTurnId ?? undefined },
      (response) => {
        if (!active.current) return;
        clearTimeout(requestTimeout.current);
        actionLocked.current = false;
        setActionPending(false);
        if (!response.success) showActionError();
      },
    );
  }

  async function handleAction(rebuild: boolean) {
    if (!gameId || actionLocked.current || (!rebuild && !selectedTarget))
      return;
    actionLocked.current = true;
    setActionPending(true);
    try {
      const response = rebuild
        ? await emitConquestRebuild(gameId)
        : await emitConquestAttack(gameId, selectedTarget!);
      if (!response.success) showActionError();
      else setSelectedTarget(null);
    } catch {
      showActionError();
    } finally {
      if (active.current) {
        actionLocked.current = false;
        setActionPending(false);
      }
    }
  }

  const availableTerritories =
    phase === "draft_selection"
      ? (draftPhase?.availableTerritories ?? [])
      : Object.keys(state.territories).filter(
          (id) => state.territories[id] && state.territories[id] !== userId,
        );
  const map = (
    <WorldMap
      territories={state.territories}
      fortTerritoryId={state.fortTerritoryId}
      playerColors={Object.fromEntries(
        players.map((player) => [player.userId, colorFor(player.userId)]),
      )}
      currentPlayerId={userId ?? ""}
      selectedTarget={selectedTarget}
      phase={phase}
      language={language}
      isMyTurn={isMyTurn && !actionPending && secondsLeft !== 0}
      availableTerritories={availableTerritories}
      onTerritoryClick={handleTerritoryClick}
    />
  );

  return (
    <section
      className={styles.root}
      dir={isAr ? "rtl" : "ltr"}
      aria-label={isAr ? "معركة الغزو" : "Conquest battle"}
    >
      <div className={styles.players}>
        {players.map((player) => (
          <div
            key={player.userId}
            className={styles.player}
            style={{ borderColor: colorFor(player.userId) }}
          >
            <strong>
              {player.username}
              {player.userId === userId ? (isAr ? " (أنت)" : " (you)") : ""}
            </strong>
            <span>
              {
                Object.values(state.territories).filter(
                  (owner) => owner === player.userId,
                ).length
              }{" "}
              {isAr ? "أقاليم" : "territories"}
            </span>
            <span>
              {isAr ? "الحصن" : "Fort"}{" "}
              <bdi>{state.fortHealth[player.userId] ?? 3}/3</bdi>
            </span>
          </div>
        ))}
      </div>
      {question ? (
        <div className={styles.questionCard}>
          <div className={styles.questionMeta}>
            <strong>
              {phase === "draft"
                ? isAr
                  ? `توزيع القواعد · الجولة ${draftPhase?.currentRound}`
                  : `Draft · Round ${draftPhase?.currentRound}`
                : isAr
                  ? "سؤال المعركة"
                  : "Battle question"}
            </strong>
            {secondsLeft !== null && (
              <span
                className={styles.timer}
                data-testid="conquest-countdown"
                role="timer"
                aria-label={isAr ? "الثواني المتبقية" : "Seconds remaining"}
              >
                {secondsLeft}
              </span>
            )}
          </div>
          {currentBattle && (
            <p className={styles.status}>
              {playerName(currentBattle.attackerId)} ⚔️{" "}
              {playerName(currentBattle.defenderId)}
            </p>
          )}
          <h2 className={styles.question}>{question.text}</h2>
          <div className={styles.answers}>
            {question.options.map((option, index) => (
              <button
                key={index}
                type="button"
                data-answer-index={index}
                className={`${styles.answer} ${selectedAnswer === index ? styles.selectedAnswer : ""}`}
                aria-pressed={selectedAnswer === index}
                disabled={!canAnswer}
                onClick={() => handleAnswer(index)}
              >
                <span className={styles.answerLetter} aria-hidden="true">
                  {String.fromCharCode(65 + index)}
                </span>
                <span>{option}</span>
                {selectedAnswer === index && <span aria-hidden="true">✓</span>}
              </button>
            ))}
          </div>
          <p className={styles.status} role="status">
            {submission?.pending
              ? isAr
                ? "جارٍ إرسال إجابتك..."
                : "Submitting your answer..."
              : answered
                ? isAr
                  ? "تم حفظ إجابتك. في انتظار بقية اللاعبين..."
                  : "Answer saved. Waiting for the other players..."
                : secondsLeft === 0
                  ? isAr
                    ? "انتهى الوقت. في انتظار النتيجة..."
                    : "Time is up. Waiting for the result..."
                  : !participant
                    ? isAr
                      ? "أنت تشاهد المعركة"
                      : "You are watching the battle"
                    : isAr
                      ? "اختر إجابة واحدة"
                      : "Choose one answer"}
          </p>
          {phase === "draft" && (
            <p className={styles.progress}>
              {isAr ? "الإجابات المستلمة" : "Answers received"}{" "}
              <bdi>
                {draftPhase?.answered ?? 0}/
                {draftPhase?.totalPlayers ?? players.length}
              </bdi>
            </p>
          )}
        </div>
      ) : (
        <div className={styles.turnPanel} role="status">
          <strong>
            {isMyTurn
              ? isAr
                ? "دورك! اختر إقليماً من الخريطة أو القائمة"
                : "Your turn! Choose a territory on the map or list"
              : isAr
                ? `في انتظار ${playerName(turnPlayerId)}`
                : `Waiting for ${playerName(turnPlayerId)}`}
          </strong>
          {phase === "draft_selection" && (
            <span>
              {draftPhase?.picksRemaining[pickerId ?? ""] ?? 0}{" "}
              {isAr ? "اختيارات متبقية" : "picks remaining"}
            </span>
          )}
          {secondsLeft !== null && (
            <span role="timer" className={styles.timer}>
              {secondsLeft}
            </span>
          )}
        </div>
      )}
      {question ? (
        <details className={styles.mapDetails}>
          <summary>{isAr ? "عرض الخريطة" : "View map"}</summary>
          {map}
        </details>
      ) : (
        map
      )}
      {isMyTurn &&
        (phase === "draft_selection" || phase === "select_target") && (
          <div
            className={styles.territoryChoices}
            aria-label={isAr ? "الأقاليم المتاحة" : "Available territories"}
          >
            {availableTerritories.map((id) => (
              <button
                type="button"
                key={id}
                className="btn btn-secondary"
                disabled={actionPending || secondsLeft === 0}
                aria-pressed={selectedTarget === id}
                onClick={() => handleTerritoryClick(id)}
              >
                {territoryName(id)}
              </button>
            ))}
          </div>
        )}
      {isMyTurn && phase === "select_target" && (
        <div className={styles.actions}>
          {selectedTarget && (
            <>
              <button
                type="button"
                className="btn btn-primary"
                disabled={actionPending}
                onClick={() => handleAction(false)}
              >
                {isAr
                  ? `هجوم على ${territoryName(selectedTarget)}`
                  : `Attack ${territoryName(selectedTarget)}`}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedTarget(null)}
              >
                {isAr ? "إلغاء" : "Cancel"}
              </button>
            </>
          )}
          {(state.fortHealth[userId ?? ""] ?? 3) < 3 && (
            <button
              type="button"
              className="btn btn-secondary"
              disabled={actionPending}
              onClick={() => handleAction(true)}
            >
              {isAr ? "إعادة بناء الحصن" : "Rebuild fort"}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

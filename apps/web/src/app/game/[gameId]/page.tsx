"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { GameMode, GameStatus, GAME_MODE_CONFIG, PowerUpType, QuestionType, getRandomQuote } from "@quiz-battle/shared";
import { useGameStore } from "@/store/gameStore";
import { emitAnswer, emitPowerUp, getSocket, emitInvasionAnswer } from "@/lib/socket";
import { ChatWindow } from "@/components/ChatWindow";
import { ConquestGame } from "@/components/ConquestGame";
import { InvasionGame } from "@/components/InvasionGame";
import ChaosGame from "@/components/ChaosGame";
import { TrueFalseQuestion } from "@/components/TrueFalseQuestion";
import { ImageQuestion } from "@/components/ImageQuestion";
import { AudioQuestion } from "@/components/AudioQuestion";
import { MultiSelectQuestion } from "@/components/MultiSelectQuestion";
import { FillBlankQuestion } from "@/components/FillBlankQuestion";
import { OrderingQuestion } from "@/components/OrderingQuestion";
import { PowerUpEffects } from "@/components/PowerUpEffects";
import { PowerUpSelection } from "@/components/PowerUpSelection";
import { soundManager } from "@/lib/sounds";

import { QuestionTransition } from "@/components/QuestionTransition";

import { ErrorBoundary } from "@/components/ErrorBoundary";

const TARGETED_POWER_UPS = new Set<PowerUpType>([
  PowerUpType.Freeze,
  PowerUpType.Sandstorm,
  PowerUpType.Steal,
  PowerUpType.Whole,
]);

const POWER_UP_INFO: Record<
  PowerUpType,
  {
    icon: string;
    label: { en: string; ar: string };
    description: { en: string; ar: string };
    needsTarget?: boolean;
  }
> = {
  [PowerUpType.Shield]: {
    icon: "🛡️",
    label: { en: "Shield", ar: "درع" },
    description: {
      en: "Raise protection for the current clash.",
      ar: "فعّل الحماية خلال هذه المواجهة.",
    },
  },
  [PowerUpType.FiftyFifty]: {
    icon: "✂️",
    label: { en: "50/50", ar: "٥٠/٥٠" },
    description: {
      en: "Erase two wrong options instantly.",
      ar: "احذف خيارين خاطئين فوراً.",
    },
  },
  [PowerUpType.Freeze]: {
    icon: "❄️",
    label: { en: "Freeze", ar: "تجميد" },
    description: {
      en: "Lock an opponent out for a few seconds.",
      ar: "جمّد خصماً لبضع ثوانٍ.",
    },
    needsTarget: true,
  },
  [PowerUpType.DoubleDown]: {
    icon: "💥",
    label: { en: "2x", ar: "مضاعف" },
    description: {
      en: "Double the reward if your answer lands.",
      ar: "ضاعف المكافأة إذا أصبت الإجابة.",
    },
  },
  [PowerUpType.Steal]: {
    icon: "🎯",
    label: { en: "Steal", ar: "سرقة" },
    description: {
      en: "Rip points away from a rival.",
      ar: "اسحب النقاط من منافسك.",
    },
    needsTarget: true,
  },
  [PowerUpType.DoublePick]: {
    icon: "🔁",
    label: { en: "2 Pick", ar: "خيارين" },
    description: {
      en: "Keep a tactical reroute in reserve.",
      ar: "احتفظ بهامش مناورة إضافي.",
    },
  },
  [PowerUpType.Whole]: {
    icon: "🌀",
    label: { en: "WHOLE", ar: "ثقب" },
    description: {
      en: "Mirror another player's recent fate.",
      ar: "اعكس أثر الإجابة الأخيرة لخصمك.",
    },
    needsTarget: true,
  },
  [PowerUpType.Sandstorm]: {
    icon: "🌪️",
    label: { en: "Sandstorm", ar: "عاصفة" },
    description: {
      en: "Blur an opponent's battlefield.",
      ar: "شوّش ساحة القتال لدى خصمك.",
    },
    needsTarget: true,
  },
  [PowerUpType.TimeWarp]: {
    icon: "⏳",
    label: { en: "Time Warp", ar: "التواء الزمن" },
    description: {
      en: "Stretch your personal answer window.",
      ar: "مدّد نافذة الإجابة الخاصة بك.",
    },
  },
};

const T = {
  round: { en: "Round", ar: "الجولة" },
  yourScore: { en: "Your Score", ar: "نتيجتك" },
  battleStarting: { en: "Battle Starting!", ar: "المعركة ستبدأ!" },
  prepare: { en: "Prepare yourself, warrior...", ar: "استعد أيها المحارب..." },
  scoreboard: { en: "Scoreboard", ar: "لوحة النتائج" },
  spectator: { en: "Spectator Mode", ar: "وضع المشاهدة" },
  powerups: { en: "Power-Ups", ar: "القوى الخارقة" },
  you: { en: "(you)", ar: "(أنت)" },
  activeEffects: { en: "Active Effects", ar: "التأثيرات النشطة" },
  chooseTarget: { en: "Choose Your Target", ar: "اختر هدفك" },
  noTargets: { en: "No live targets right now.", ar: "لا توجد أهداف متاحة الآن." },
  cancel: { en: "Cancel", ar: "إلغاء" },
  react: { en: "React", ar: "تفاعل" },
  targetPrompt: { en: "Pick a rival for this move.", ar: "اختر منافساً لهذه الحركة." },
  frozen: { en: "Frozen", ar: "متجمد" },
  sandstorm: { en: "Sandstorm", ar: "عاصفة رملية" },
  timeWarp: { en: "Time Warp", ar: "التواء الزمن" },
  shielded: { en: "Shielded", ar: "محمي" },
  extraTime: { en: "Extra time live", ar: "وقت إضافي نشط" },
};

const OPTION_LETTERS = ["A", "B", "C", "D"];

function getEffectSecondsLeft(expiresAt?: number, now = Date.now()): number | null {
  if (!expiresAt) return null;
  return Math.max(1, Math.ceil((expiresAt - now) / 1000));
}

export default function GamePage() {
  return (
    <ErrorBoundary>
      <GamePageContent />
    </ErrorBoundary>
  );
}

function GamePageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const gameId = params.gameId as string;
  const isSpectating = searchParams.get("spectate") === "true";

  const {
    userId,
    currentQuestion,
    currentRound,
    totalRounds,
    selectedAnswer,
    eliminatedOptions,
    players,
    currentPlayer,
    status,
    timeLeft,
    mode,
    language,
    activeEffects,
    questionStartedAt,
    timeWarpBonusSeconds,
    lastAnswerResult,
    setTimeLeft,
    selectAnswer,
    conquestState,
    invasionState,
    powerUpSelection,
    removeEffect,
  } = useGameStore();

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [feedbackQuote, setFeedbackQuote] = useState<{ en: string; ar: string } | null>(null);
  const [pendingPowerUp, setPendingPowerUp] = useState<PowerUpType | null>(null);
  const [now, setNow] = useState(Date.now());
  const [showTransition, setShowTransition] = useState(false);
  const [transitionRound, setTransitionRound] = useState(0);

  const isRTL = language === "ar";

  useEffect(() => {
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(clock);
  }, []);

  useEffect(() => {
    if (status !== GameStatus.Question || !currentQuestion || !questionStartedAt) return;

    // Only show transition after first round
    if (currentRound > 1 && currentRound !== transitionRound) {
      setShowTransition(true);
      setTransitionRound(currentRound);
      return;
    }

    setShowScoreboard(false);

    const syncTimer = () => {
      const totalSeconds = currentQuestion.timeLimit + timeWarpBonusSeconds;
      const elapsedSeconds = (Date.now() - questionStartedAt) / 1000;
      const remaining = Math.max(0, Math.ceil(totalSeconds - elapsedSeconds));
      setTimeLeft(remaining);
    };

    syncTimer();
    timerRef.current = setInterval(syncTimer, 250);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [currentQuestion?.id, questionStartedAt, setTimeLeft, status, timeWarpBonusSeconds, currentRound, transitionRound]);

  useEffect(() => {
    if (status === GameStatus.Question && currentQuestion && mode) {
      soundManager.playModeSound(mode);
    }
  }, [currentQuestion?.id, mode, status]);

  useEffect(() => {
    if (status === GameStatus.Ended) {
      router.push(`/results/${gameId}`);
      return;
    }

    if (status === GameStatus.AnswerReveal) {
      setShowScoreboard(true);
      setPendingPowerUp(null);
      if (lastAnswerResult) {
        setFeedbackQuote(getRandomQuote(lastAnswerResult.correct ? "right" : "wrong"));
      } else {
        setFeedbackQuote(null);
      }
      return;
    }

    setFeedbackQuote(null);
  }, [gameId, lastAnswerResult, router, status]);

  useEffect(() => {
    if (status !== GameStatus.Question) {
      setPendingPowerUp(null);
    }
  }, [status]);

  const liveEffects = activeEffects.filter((effect) => !effect.expiresAt || effect.expiresAt > now);
  const effectsOnMe = liveEffects.filter((effect) => effect.targetUserId === userId);
  const effectsFromMe = liveEffects.filter(
    (effect) => effect.sourceUserId === userId && (!effect.targetUserId || effect.type === PowerUpType.TimeWarp)
  );

  const isFrozen = effectsOnMe.some((effect) => effect.type === PowerUpType.Freeze);
  const isSandstormed = effectsOnMe.some((effect) => effect.type === PowerUpType.Sandstorm);
  const hasTimeWarp = effectsFromMe.some((effect) => effect.type === PowerUpType.TimeWarp);
  const hasShield = effectsFromMe.some((effect) => effect.type === PowerUpType.Shield);

  const visibleTargetEffects = [...effectsOnMe, ...effectsFromMe];
  const availableTargets = players.filter(
    (player) => player.userId !== userId && !player.isEliminated && player.isConnected
  );

  function handleAnswer(index: number | string | number[]) {
    if (isFrozen || isSpectating) return;
    if (selectedAnswer !== null || !currentQuestion) return;
    if (typeof index === 'number' && eliminatedOptions.includes(index)) return;
    
    // Convert to number if needed for selectAnswer
    const numericIndex = typeof index === 'number' ? index : 0;
    selectAnswer(numericIndex);
    
    if (invasionState) {
      const numIndex = typeof index === 'number' ? index : 0;
      emitInvasionAnswer(gameId, numIndex, Date.now() - (questionStartedAt || Date.now()));
    } else {
      emitAnswer(gameId, currentQuestion.id, index);
    }
  }

  async function triggerPowerUp(type: PowerUpType, targetUserId?: string) {
    const res = await emitPowerUp(gameId, type, targetUserId);
    if (!res.success) {
      useGameStore.getState().addToast(
        "error",
        res.error || (language === "ar" ? "فشل تفعيل القوة الخاصة." : "Power-up failed.")
      );
      return;
    }

    setPendingPowerUp(null);
  }

  async function handlePowerUp(type: PowerUpType) {
    if (isFrozen || isSpectating) return;
    
    if (TARGETED_POWER_UPS.has(type)) {
      if (availableTargets.length === 0) {
        useGameStore.getState().addToast("error", T.noTargets[language]);
        return;
      }
      setPendingPowerUp(type);
      return;
    }

    await triggerPowerUp(type);
  }

  const effectiveTimeLimit = currentQuestion
    ? currentQuestion.timeLimit + timeWarpBonusSeconds
    : 1;
  const timeFraction = currentQuestion ? Math.max(0, timeLeft / effectiveTimeLimit) : 1;
  const timerClass = timeFraction < 0.25 ? "danger" : timeFraction < 0.5 ? "warning" : "";

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - timeFraction);

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const themeClass = mode ? `theme-${mode.toLowerCase()}` : "";
  const modeConfig = mode ? GAME_MODE_CONFIG[mode] : { hasPowerUps: true };

  const questionArenaClass = [
    "glass-card",
    "p-6",
    "animate-scale-in",
    "question-arena",
    isFrozen ? "frozen" : "",
    isSandstormed ? "sandstormed" : "",
    hasTimeWarp ? "time-warped" : "",
  ]
    .filter(Boolean)
    .join(" ");

  // Show transition overlay
  if (showTransition && currentRound > 0) {
    return (
      <QuestionTransition
        round={currentRound}
        totalRounds={totalRounds}
        language={language}
        onComplete={() => setShowTransition(false)}
      />
    );
  }

  // Show power-up selection only when status is PowerUpSelect AND selection is active
  if (status === GameStatus.PowerUpSelect && powerUpSelection?.isSelecting) {
    return (
      <main className={`page ${themeClass}`} dir={isRTL ? "rtl" : "ltr"} style={{ minHeight: "100dvh", padding: "16px" }}>
        <PowerUpSelection />
      </main>
    );
  }

  // Render CHAOS mode
  if (mode === GameMode.Chaos) {
    return (
      <main className={`page ${themeClass}`} dir={isRTL ? "rtl" : "ltr"} style={{ minHeight: "100dvh" }}>
        <ChaosGame />
      </main>
    );
  }

  return (
    <main className={`page ${themeClass}`} dir={isRTL ? "rtl" : "ltr"} style={{ minHeight: "100dvh", padding: "16px" }}>
      <div style={{ maxWidth: (mode === GameMode.Conquest || invasionState) ? 1200 : 680, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16, width: "100%" }}>
        {/* Conquest mode map — show in background */}
        {mode === GameMode.Conquest && conquestState && (
          <div style={{ position: 'relative', marginBottom: 20 }}>
            <ConquestGame />
          </div>
        )}

        {/* Invasion mode map — Phase 2 of conquest */}
        {invasionState && (
          <div style={{ position: 'relative', marginBottom: 20 }}>
            <InvasionGame />
          </div>
        )}

        {/* Standard mode UI */}
        {isSpectating && (
          <div className="glass-card p-3 text-center" style={{ border: "1px solid var(--clr-primary)", background: "rgba(108, 99, 255, 0.1)" }}>
            <strong>{T.spectator[language]}</strong>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ textAlign: isRTL ? "right" : "left" }}>
            <div className="text-muted text-sm">{T.round[language]}</div>
            <div className="font-bold text-xl">{currentRound} / {totalRounds}</div>
          </div>

          <div className={`timer-ring ${timerClass}`}>
            <svg width="80" height="80" viewBox="0 0 90 90">
              <circle className="track" cx="45" cy="45" r={radius} strokeWidth="6" />
              <circle
                className="fill"
                cx="45"
                cy="45"
                r={radius}
                strokeWidth="6"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
              />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span className="font-bold font-mono text-xl">{timeLeft}</span>
            </div>
          </div>

          <div style={{ textAlign: isRTL ? "left" : "right" }}>
            <div className="text-muted text-sm">{T.yourScore[language]}</div>
            <div className="font-bold text-xl" style={{ color: "var(--clr-primary)" }}>
              {currentPlayer?.score?.toLocaleString() || 0}
            </div>
          </div>
        </div>

        {visibleTargetEffects.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: isRTL ? "flex-end" : "flex-start" }}>
            {visibleTargetEffects.map((effect, index) => {
              const secondsLeft = getEffectSecondsLeft(effect.expiresAt, now);
              const info = POWER_UP_INFO[effect.type];
              return (
                <div
                  key={`${effect.type}-${effect.sourceUserId}-${effect.targetUserId || "self"}-${index}`}
                  className="glass-card"
                  style={{
                    padding: "10px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    border: "1px solid rgba(255,255,255,0.09)",
                    background:
                      effect.type === PowerUpType.Sandstorm
                        ? "linear-gradient(135deg, rgba(255,166,0,0.18), rgba(255,214,10,0.08))"
                        : effect.type === PowerUpType.Freeze
                          ? "linear-gradient(135deg, rgba(0,212,255,0.18), rgba(108,99,255,0.08))"
                          : "rgba(255,255,255,0.04)",
                  }}
                >
                  <span style={{ fontSize: "1.1rem" }}>{info.icon}</span>
                  <div style={{ textAlign: isRTL ? "right" : "left" }}>
                    <div style={{ fontWeight: 700, fontSize: "0.85rem" }}>{info.label[language]}</div>
                    <div className="text-xs text-muted">
                      {secondsLeft ? `${secondsLeft}s` : T.extraTime[language]}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {currentQuestion && (
          <div className={questionArenaClass} style={mode === GameMode.Conquest ? { 
            position: 'relative',
            zIndex: 100,
            width: '100%',
            maxWidth: '600px',
            margin: '0 auto',
            background: 'rgba(15, 23, 42, 0.98)',
            backdropFilter: 'blur(12px)',
            border: '2px solid var(--clr-primary)',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)'
          } : {}}>
            {(isFrozen || isSandstormed || hasTimeWarp || hasShield) && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
                {isFrozen && <span className="battle-status battle-status-frozen">❄️ {T.frozen[language]}</span>}
                {isSandstormed && <span className="battle-status battle-status-sandstorm">🌪️ {T.sandstorm[language]}</span>}
                {hasTimeWarp && <span className="battle-status battle-status-timewarp">⏳ {T.timeWarp[language]}</span>}
                {hasShield && <span className="battle-status battle-status-shield">🛡️ {T.shielded[language]}</span>}
              </div>
            )}

            {/* Question Text */}
            <p style={{ fontSize: "clamp(1.1rem, 3vw, 1.4rem)", fontWeight: 700, lineHeight: 1.5, marginBottom: 24, textAlign: isRTL ? "right" : "left" }}>
              {currentQuestion.text}
            </p>

            {/* Conditional: Image, Audio, True/False, or Standard Options */}
            {(() => {
              // Check for Image Question
              const isImageQuestion =
                currentQuestion.type === QuestionType.ImageQuestion ||
                currentQuestion.imageUrl;

              // Check for Audio Question
              const isAudioQuestion =
                currentQuestion.type === QuestionType.AudioQuestion ||
                currentQuestion.audioUrl;

              // Check for True/False Question
              const isTrueFalseQuestion =
                currentQuestion.type === QuestionType.TrueFalse ||
                (currentQuestion.options?.length === 2 &&
                 currentQuestion.options?.every((o: string) =>
                   o.toLowerCase() === 'true' || o.toLowerCase() === 'false'
                 ));

              // Check for MultiSelect Question
              const isMultiSelect = currentQuestion.type === QuestionType.MultiSelect;

              // Check for FillBlank Question
              const isFillBlank =
                currentQuestion.type === QuestionType.FillBlank ||
                currentQuestion.text?.includes('[BLANK]') ||
                currentQuestion.text?.includes('[___]') ||
                currentQuestion.text?.includes('___');

              // Check for Ordering Question
              const isOrdering = currentQuestion.type === QuestionType.Ordering;

              // Render Image Question
              if (isImageQuestion) {
                return (
                  <ImageQuestion
                    question={currentQuestion}
                    status={status}
                    timeLeft={timeLeft}
                    selectedAnswer={selectedAnswer}
                    lastAnswerResult={lastAnswerResult}
                    language={language}
                    onAnswer={(index) => {
                      selectAnswer(index);
                      emitAnswer(gameId, currentQuestion.id, index);
                    }}
                  />
                );
              }

              // Render Audio Question
              if (isAudioQuestion) {
                return (
                  <AudioQuestion
                    question={currentQuestion}
                    status={status}
                    timeLeft={timeLeft}
                    selectedAnswer={selectedAnswer}
                    lastAnswerResult={lastAnswerResult}
                    language={language}
                    onAnswer={(index) => {
                      selectAnswer(index);
                      emitAnswer(gameId, currentQuestion.id, index);
                    }}
                  />
                );
              }

              // Render True/False Question
              if (isTrueFalseQuestion) {
                return (
                  <TrueFalseQuestion
                    question={currentQuestion}
                    status={status}
                    timeLeft={timeLeft}
                    selectedAnswer={selectedAnswer}
                    lastAnswerResult={lastAnswerResult}
                    language={language}
                    onAnswer={(index) => {
                      selectAnswer(index);
                      emitAnswer(gameId, currentQuestion.id, index);
                    }}
                  />
                );
              }

              // Render MultiSelect Question
              if (isMultiSelect) {
                return (
                  <MultiSelectQuestion
                    question={currentQuestion}
                    status={status}
                    timeLeft={timeLeft}
                    selectedAnswer={selectedAnswer}
                    lastAnswerResult={lastAnswerResult}
                    language={language}
                    onSubmit={(indices) => {
                      handleAnswer(indices);
                    }}
                  />
                );
              }

              // Render FillBlank Question
              if (isFillBlank) {
                return (
                  <FillBlankQuestion
                    question={currentQuestion}
                    status={status}
                    timeLeft={timeLeft}
                    selectedAnswer={selectedAnswer}
                    lastAnswerResult={lastAnswerResult}
                    language={language}
                    onAnswer={(answer) => {
                      handleAnswer(answer);
                    }}
                  />
                );
              }

              // Render Ordering Question
              if (isOrdering) {
                return (
                  <OrderingQuestion
                    question={currentQuestion}
                    status={status}
                    timeLeft={timeLeft}
                    selectedAnswer={selectedAnswer}
                    lastAnswerResult={lastAnswerResult}
                    language={language}
                    onSubmit={(orderedIndices) => {
                      handleAnswer(orderedIndices);
                    }}
                  />
                );
              }

              // Default: Standard Multiple Choice
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {currentQuestion.options.map((option, i) => {
                    const isEliminated = eliminatedOptions.includes(i);
                    const isSelected = selectedAnswer === i;
                    const isCorrect = lastAnswerResult && lastAnswerResult.correctIndex === i;
                    const isWrong = lastAnswerResult && isSelected && !lastAnswerResult.correct;
                    
                    let extraClass = "";
                    if (isEliminated) extraClass = "eliminated";
                    else if (status === GameStatus.AnswerReveal && isCorrect) extraClass = "correct";
                    else if (status === GameStatus.AnswerReveal && isWrong) extraClass = "wrong";
                    else if (isSelected) extraClass = "selected";
                    else if (selectedAnswer !== null || isFrozen) extraClass = "disabled";

                    return (
                      <div
                        key={i}
                        className={`answer-option ${extraClass}`}
                        onClick={isSpectating || isFrozen || status === GameStatus.AnswerReveal ? undefined : () => handleAnswer(i)}
                        style={{
                          cursor: isSpectating || isFrozen || status === GameStatus.AnswerReveal ? "default" : "pointer",
                          justifyContent: "flex-start",
                          position: "relative",
                          overflow: "hidden"
                        }}
                      >
                        {isSelected && status === GameStatus.Question && (
                          <div style={{
                            position: "absolute",
                            inset: 0,
                            background: "linear-gradient(90deg, transparent, rgba(0,212,255,0.2), transparent)",
                            animation: "shimmer 1.5s ease-in-out infinite"
                          }} />
                        )}
                        <div className="option-letter" style={{ 
                          [isRTL ? "marginLeft" : "marginRight"]: 14,
                          position: "relative",
                          zIndex: 1
                        }}>
                          {OPTION_LETTERS[i]}
                        </div>
                        <span style={{ flex: 1, textAlign: isRTL ? "right" : "left", position: "relative", zIndex: 1 }}>{option}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        <div style={{ textAlign: isRTL ? "right" : "left", marginBottom: 10 }}>
          <div className="text-muted text-sm" style={{ marginBottom: 10 }}>💬 {T.react[language]}</div>
          <div style={{ display: "flex", gap: 8 }}>
            {["🔥", "💀", "🤣", "🫡", "😱", "❓"].map((emote) => (
              <button
                key={emote}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: "1.2rem", padding: "8px 12px", minWidth: 50 }}
                disabled={isSpectating}
                onClick={() => {
                  if (!isSpectating) {
                    getSocket()?.emit("game:emote", { gameId, emote });
                  }
                }}
              >
                {emote}
              </button>
            ))}
          </div>
        </div>

        {modeConfig.hasPowerUps && currentPlayer && currentPlayer.powerUpInventory.length > 0 && (
          <div style={{ textAlign: isRTL ? "right" : "left" }}>
            <div className="text-muted text-sm" style={{ marginBottom: 10 }}>⚡ {T.powerups[language]}</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {currentPlayer.powerUpInventory.map((pu, i) => {
                const info = POWER_UP_INFO[pu];
                return (
                  <button
                    key={`${pu}-${i}`}
                    className="powerup-card"
                    onClick={() => handlePowerUp(pu)}
                    style={{ width: 96, height: 96 }}
                  >
                    <span style={{ fontSize: "1.8rem" }}>{info.icon}</span>
                    <span style={{ fontSize: "0.72rem", color: "var(--clr-text-2)", fontWeight: 700 }}>{info.label[language]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {pendingPowerUp && (
          <div className="glass-card p-4 animate-fade-in battle-target-panel">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
              <div>
                <div className="font-bold" style={{ marginBottom: 4 }}>
                  {POWER_UP_INFO[pendingPowerUp].icon} {T.chooseTarget[language]}
                </div>
                <div className="text-sm text-muted">{POWER_UP_INFO[pendingPowerUp].description[language]}</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setPendingPowerUp(null)}>
                {T.cancel[language]}
              </button>
            </div>

            <div className="text-sm text-muted" style={{ marginBottom: 14 }}>
              {T.targetPrompt[language]}
            </div>

            {availableTargets.length === 0 ? (
              <div className="text-sm text-muted">{T.noTargets[language]}</div>
            ) : (
              <div className="battle-target-grid">
                {availableTargets.map((player) => (
                  <button
                    key={player.userId}
                    className="battle-target-card"
                    onClick={() => triggerPowerUp(pendingPowerUp, player.userId)}
                  >
                    <div className="player-avatar" style={{ width: 38, height: 38, fontSize: "0.9rem" }}>
                      {player.username.charAt(0)}
                    </div>
                    <div style={{ flex: 1, textAlign: isRTL ? "right" : "left" }}>
                      <div style={{ fontWeight: 700 }}>{player.username}</div>
                      <div className="text-xs text-muted">{player.score.toLocaleString()} pts</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

            {showScoreboard && (
          <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Answer Feedback */}
            {lastAnswerResult && (
              <div 
                className="glass-card p-6 text-center" 
                style={{
                  border: lastAnswerResult.correct ? "2px solid var(--clr-success)" : "2px solid var(--clr-danger)",
                  background: lastAnswerResult.correct ? "rgba(0,230,118,0.12)" : "rgba(255,71,87,0.12)",
                  animation: "scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)"
                }}
              >
                <div style={{ fontSize: "4rem", marginBottom: 16, animation: "float 2s ease-in-out infinite" }}>
                  {lastAnswerResult.correct ? "✓" : "✗"}
                </div>
                <div 
                  style={{ 
                    fontSize: "1.5rem", 
                    fontWeight: 900, 
                    color: lastAnswerResult.correct ? "var(--clr-success)" : "var(--clr-danger)",
                    marginBottom: 12
                  }}
                >
                  {lastAnswerResult.correct 
                    ? (language === "ar" ? "إجابة صحيحة!" : "Correct Answer!") 
                    : (language === "ar" ? "إجابة خاطئة" : "Wrong Answer")}
                </div>
                {feedbackQuote && (
                  <div className="text-muted" style={{ fontSize: "1.1rem", fontStyle: "italic" }}>
                    "{feedbackQuote[language]}"
                  </div>
                )}
              </div>
            )}

            <div className="glass-card p-4">
              <div className="font-bold" style={{ marginBottom: 12, textAlign: isRTL ? "right" : "left" }}>📊 {T.scoreboard[language]}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {sortedPlayers.map((player, index) => (
                  <div key={player.userId} style={{ display: "flex", alignItems: "center", gap: 10, flexDirection: isRTL ? "row-reverse" : "row" }}>
                    <span style={{ width: 24, textAlign: "center", fontWeight: 700 }}>#{index + 1}</span>
                    <div className="player-avatar" style={{ width: 32, height: 32, fontSize: "0.8rem" }}>{player.username.charAt(0)}</div>
                    <span style={{ flex: 1, fontWeight: player.userId === userId ? 700 : 400, textAlign: isRTL ? "right" : "left" }}>
                      {player.username} {player.userId === userId && T.you[language]}
                    </span>
                    <span className="font-mono font-bold" style={{ color: "var(--clr-primary)" }}>{player.score}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <ChatWindow gameId={gameId} />
      </div>

      {/* Power-Up Visual Effects */}
      <PowerUpEffects
        activeEffects={activeEffects}
        currentUserId={userId || ""}
        onEffectComplete={removeEffect}
      />
    </main>
  );
}

"use client";
import { getServerTime } from "@/lib/gameClock";

import { useEffect, useState, useCallback, useRef } from "react";
import { useGameStore } from "@/store/gameStore";
import { motion, AnimatePresence } from "framer-motion";
import { GameStatus, PowerUpType, type AckResponse, type ChaosClientSnapshot, type ChaosVote } from "@quiz-battle/shared";
import { RoundProgress } from "./RoundProgress";
import { QuestionReview } from "./QuestionReview";
import { EmoteSystem } from "./EmoteSystem";
import { useSound } from "@/hooks/useSound";
import { emitAnswer, emitChaosStartVoting, emitChaosVote, getSocket } from "@/lib/socket";

// ═══════════════════════════════════════════════════════════════════════════════
// CHAOS GAME COMPONENT - Full integration of CHAOS mode
// ═══════════════════════════════════════════════════════════════════════════════

export default function ChaosGame({ isSpectating = false }: { isSpectating?: boolean }) {
  const {
    status,
    currentQuestion: question,
    timeLeft,
    players,
    userId,
    currentPlayer,
    language,
    gameId,
    selectedAnswer,
    eliminatedOptions,
    lastAnswerResult,
    chaosState,
    isConnected,
    hostId,
    activeEffects,
    timeWarpBonusSeconds,
  } = useGameStore();

  const { play } = useSound();
  const isAr = language === "ar";
  const [showReview, setShowReview] = useState(false);
  const [showChaosLog, setShowChaosLog] = useState(false);
  const [now, setNow] = useState(getServerTime);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmedVote, setConfirmedVote] = useState<string | null>(null);
  const actionInFlight = useRef(false);
  const voting = chaosState?.votingSession;
  const drama = chaosState?.pendingDrama;
  const deadline = chaosState?.voteDeadline;
  const votingSeconds = deadline ? Math.max(0, Math.ceil((deadline - now) / 1000)) : 0;
  const canParticipate = !isSpectating && isConnected && !!currentPlayer && !currentPlayer.isEliminated;
  const liveDrama = drama && drama.expiresAt > now ? drama : null;
  const canStartVote = canParticipate && userId === hostId && !!liveDrama && !voting &&
    (status === GameStatus.Question || status === GameStatus.AnswerReveal);
  const voted = !!voting && (voting.hasVoted || confirmedVote === voting.dramaEventId);
  const isFrozen = activeEffects.some((effect) => effect.type === PowerUpType.Freeze &&
    effect.targetUserId === userId && (!effect.expiresAt || effect.expiresAt > now));
  const canAnswer = canParticipate && !isFrozen && status === GameStatus.Question && timeLeft > 0 && selectedAnswer === null;

  useEffect(() => {
    setNow(getServerTime());
    const clock = setInterval(() => setNow(getServerTime()), 250);
    return () => clearInterval(clock);
  }, []);

  const dismissTrapResult = useCallback(() => useGameStore.getState().setTrapResult(null), []);

  // Play sounds on state changes
  useEffect(() => {
    if (status === GameStatus.Question) {
      play("tick", 0.3);
    }
  }, [status, play]);

  useEffect(() => {
    if (lastAnswerResult) {
      play(lastAnswerResult.correct ? "correct" : "wrong");
    }
  }, [lastAnswerResult, play]);

  // Drama detection: tab visibility change
  useEffect(() => {
    if (!gameId || !canParticipate || status !== GameStatus.Question || typeof document === "undefined") return;
    
    const handleVisibilityChange = () => {
      if (document.hidden && getSocket().connected) {
        getSocket().emit("chaos:drama", { gameId, type: "TAB_LEFT" });
      }
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [gameId, status, canParticipate]);

  async function submitVoteAction(
    dramaId: string,
    send: () => Promise<AckResponse>,
    isVote: boolean
  ) {
    if (actionInFlight.current || !getSocket().connected) return;
    actionInFlight.current = true;
    setPendingAction(dramaId);
    setActionError(null);
    try {
      const response = await send();
      if (!response.success) throw new Error("Voting action rejected");
      if (isVote) setConfirmedVote(dramaId);
      play("click");
    } catch {
      setActionError(dramaId);
    } finally {
      actionInFlight.current = false;
      setPendingAction(null);
    }
  }

  function handleStartVoting() {
    if (!gameId || !drama || !canStartVote || getServerTime() >= drama.expiresAt) return;
    void submitVoteAction(drama.id, () => emitChaosStartVoting(gameId, drama.id), false);
  }

  function handleVote(vote: ChaosVote) {
    if (!gameId || !voting?.canVote || voted || !canParticipate || !deadline || getServerTime() >= deadline) return;
    if (!voting.options.includes(vote)) return;
    void submitVoteAction(voting.dramaEventId, () => emitChaosVote(gameId, voting.dramaEventId, vote), true);
  }

  function handleAnswer(index: number) {
    const state = useGameStore.getState();
    if (!gameId || !question || !canAnswer || !getSocket().connected) return;
    if (state.currentQuestion?.id !== question.id || state.selectedAnswer !== null || state.timeLeft <= 0 ||
      state.status !== GameStatus.Question || state.eliminatedOptions.includes(index)) return;
    state.selectAnswer(index);
    emitAnswer(gameId, question.id, index);
    play("click");
  }

  const isEliminated = (index: number) => eliminatedOptions?.includes(index);

  // Get chaos visual effects based on state
  const getChaosVisuals = () => {
    if (!chaosState) return {};
    const { state } = chaosState;
    const visuals: { shake?: boolean; glitch?: boolean; flash?: boolean; color?: string } = {};
    
    if (state === "INSANITY") {
      visuals.shake = true;
      visuals.color = "#ff4757";
    } else if (state === "ANARCHY") {
      visuals.shake = true;
      visuals.glitch = true;
      visuals.flash = true;
      visuals.color = "#ff00ff";
    }
    return visuals;
  };

  const chaosVisuals = getChaosVisuals();

  return (
    <div 
      className="min-h-screen text-white overflow-hidden relative"
      style={{
        background: chaosState?.state === "ANARCHY" 
          ? "linear-gradient(135deg, #1a0f1a 0%, #0f0f1a 50%, #1a0f1a 100%)"
          : "#0a0a0f",
        animation: chaosVisuals.shake ? "chaos-shake 0.3s infinite" : undefined,
      }}
    >
      {/* Chaos Background Effects */}
      {chaosState && (
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }} aria-hidden="true">
          {/* Chaos particles */}
          {Array.from({ length: Math.floor(chaosState.level / 10) }).map((_, i) => (
            <motion.div
              key={i}
              className="text-2xl"
              style={{ position: "absolute" }}
              initial={{ 
                x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000), 
                y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
                opacity: 0 
              }}
              animate={{ 
                y: [null, Math.random() * -100],
                opacity: [0, 0.5, 0],
                rotate: [0, 360]
              }}
              transition={{ 
                duration: 3 + Math.random() * 2, 
                repeat: Infinity,
                delay: Math.random() * 2
              }}
            >
              {["🎲", "⚡", "🔥", "💀", "🌀"][i % 5]}
            </motion.div>
          ))}
          
          {/* Glitch overlay for ANARCHY */}
          {chaosVisuals.glitch && (
            <div 
              className="absolute inset-0"
              style={{
                background: "linear-gradient(90deg, transparent 0%, rgba(255,0,255,0.1) 50%, transparent 100%)",
                animation: "glitch-sweep 1s infinite",
              }}
            />
          )}
        </div>
      )}

      {/* Chaos State Indicator */}
      <div className="container" style={{ position: "relative", maxWidth: 900, paddingTop: 24 }}>
      {chaosState && (
        <motion.div
          style={{ display: "inline-block" }}
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
        >
          <div 
            className="px-4 py-2 rounded-xl font-bold text-sm border-2"
            style={{
              background: "rgba(0,0,0,0.8)",
              borderColor: chaosVisuals.color || "#ff00ff",
              color: chaosVisuals.color || "#ff00ff",
              boxShadow: `0 0 20px ${chaosVisuals.color || "#ff00ff"}40`,
            }}
          >
            <div className="flex items-center gap-2">
              <span>{chaosState.state === "ANARCHY" ? "💀" : chaosState.state === "INSANITY" ? "🔥" : "🌀"}</span>
              <span>{chaosState.state}</span>
              <span className="text-xs opacity-70">({chaosState.level}%)</span>
            </div>
            {/* Chaos meter bar */}
            <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden w-32">
              <motion.div
                className="h-full rounded-full"
                style={{ 
                  background: `linear-gradient(90deg, #00e676 0%, #ffd700 50%, #ff4757 100%)`,
                }}
                initial={{ width: 0 }}
                animate={{ width: `${chaosState.level}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Chaos Log Toggle */}
      {chaosState && (
        <motion.button
          className="btn btn-secondary btn-sm"
          style={{ marginInlineStart: 12 }}
          onClick={() => setShowChaosLog(!showChaosLog)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          📜 {isAr ? "سجل الفوضى" : "Chaos Log"}
        </motion.button>
      )}

      {/* Chaos Log Panel */}
      <AnimatePresence>
        {showChaosLog && chaosState && (
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className="mt-3"
            style={{
              background: "rgba(0,0,0,0.9)",
              border: "1px solid rgba(255,0,255,0.3)",
              borderRadius: "12px",
              padding: "12px",
              maxHeight: 200,
              overflowY: "auto",
            }}
          >
            <h4 className="text-purple-400 font-bold mb-2 text-sm">
              {isAr ? "سجل الأحداث" : "Event Log"}
            </h4>
            {chaosState.chaosLog.length === 0 ? (
              <p className="text-gray-500 text-xs">{isAr ? "لا أحداث بعد" : "No events yet"}</p>
            ) : (
              <div className="space-y-2">
                {[...chaosState.chaosLog].reverse().map((log, i) => (
                  <div key={i} className="text-xs border-l-2 border-purple-500/30 pl-2">
                    <span className="text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    <p className="text-gray-300">{log.message}</p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      {/* Round Progress */}
      <RoundProgress />

      {/* Main Game Area */}
      <div className="container" style={{ position: "relative", maxWidth: 900, paddingTop: 20, paddingBottom: 80 }}>
        {liveDrama && !voting && (
          <DramaPopup
            drama={liveDrama}
            language={language}
            onStartVoting={canStartVote ? handleStartVoting : undefined}
            pending={pendingAction === liveDrama.id}
          />
        )}
        {voting && (
          <VotingInterface
            voting={voting}
            language={language}
            onVote={handleVote}
            hasVoted={voted}
            canVote={canParticipate && voting.canVote}
            pending={pendingAction === voting.dramaEventId}
            seconds={votingSeconds}
          />
        )}
        {actionError && (actionError === drama?.id || actionError === voting?.dramaEventId) && (
          <p role="alert" className="mb-4" style={{ color: "var(--clr-accent)" }}>
            {isAr ? "تعذر إتمام إجراء التصويت. حاول مرة أخرى." : "Voting action failed. Try again."}
          </p>
        )}
        {!question && !voting && !liveDrama && (
          <p role="status" className="text-center text-gray-400">
            {isAr ? "في انتظار السؤال..." : "Waiting for the question..."}
          </p>
        )}

        <AnimatePresence>
          {/* Trap Warning */}
          {chaosState?.activeTrap && !chaosState.evaluatingTrap && (
            <TrapWarning 
              key="trap-warning"
              trap={chaosState.activeTrap} 
              language={language}
              isTarget={chaosState.activeTrap.isTarget}
            />
          )}

          {/* Evaluating Trap */}
          {chaosState?.evaluatingTrap && (
            <EvaluatingTrap key="trap-evaluating" language={language} />
          )}

          {/* Trap Result */}
          {chaosState?.lastTrapResult && (
            <TrapResult
              key="trap-result"
              result={chaosState.lastTrapResult} 
              language={language}
              onClose={dismissTrapResult}
            />
          )}

          {/* Question Phase */}
          {question && status === GameStatus.Question && (
            <motion.div
              key="question"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Timer */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">
                    {isAr ? "الوقت المتبقي" : "Time Remaining"}
                  </span>
                  <span className={`text-2xl font-bold ${timeLeft <= 5 ? "text-red-500" : "text-amber-400"}`}>
                    {timeLeft}s
                  </span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: "100%" }}
                    animate={{ width: `${Math.min(100, (timeLeft / Math.max(1, question.timeLimit + timeWarpBonusSeconds)) * 100)}%` }}
                    transition={{ duration: 1, ease: "linear" }}
                    className={`h-full rounded-full ${
                      timeLeft <= 5 ? "bg-red-500" : chaosState?.activeTrap ? "bg-purple-500" : "bg-amber-500"
                    }`}
                  />
                </div>
              </div>

              {/* Question */}
              <div 
                className="rounded-3xl p-6 mb-6 border-2"
                style={{
                  background: chaosState?.activeTrap 
                    ? "linear-gradient(135deg, #2d1818 0%, #1a0f1a 100%)"
                    : "#1a1a2e",
                  borderColor: chaosState?.activeTrap ? "#ff4757" : "#2a2a3e",
                }}
              >
                <p className="text-xl md:text-2xl font-bold text-white text-center leading-relaxed">
                  {isAr ? (question.textAr || question.text) : (question.textEn || question.text)}
                </p>
              </div>

              {/* Options */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))", gap: 12 }}>
                {((isAr ? (question.optionsAr || question.options) : (question.optionsEn || question.options)) || []).map((option: string, index: number) => {
                  const eliminated = isEliminated(index);
                  const selected = selectedAnswer === index;

                  return (
                    <motion.button
                      key={index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: eliminated ? 0.3 : 1, scale: 1 }}
                      whileHover={!eliminated && canAnswer ? { scale: 1.02 } : {}}
                      whileTap={!eliminated && canAnswer ? { scale: 0.98 } : {}}
                      disabled={eliminated || !canAnswer}
                      onClick={() => handleAnswer(index)}
                      className="btn btn-secondary rounded-2xl"
                      aria-pressed={selected}
                      style={{
                        justifyContent: "flex-start",
                        whiteSpace: "normal",
                        textAlign: "start",
                        borderColor: selected ? "var(--clr-primary)" : undefined,
                        opacity: selected ? 1 : undefined,
                      }}
                    >
                      <span className="inline-block w-8 h-8 rounded-full bg-gray-700 text-center leading-8 mr-3 text-sm">
                        {String.fromCharCode(65 + index)}
                      </span>
                      {option}
                    </motion.button>
                  );
                })}
              </div>

            </motion.div>
          )}

          {/* Answer Reveal Phase */}
          {status === GameStatus.AnswerReveal && lastAnswerResult && (
            <motion.div
              key="reveal"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center py-12"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 10 }}
                className={`w-32 h-32 mx-auto mb-6 rounded-full flex items-center justify-center text-6xl ${
                  lastAnswerResult.correct
                    ? "bg-green-500 text-white"
                    : "bg-red-500 text-white"
                }`}
              >
                {lastAnswerResult.correct ? "✓" : "✗"}
              </motion.div>

              <h2 className={`text-3xl font-bold mb-4 ${lastAnswerResult.correct ? "text-green-400" : "text-red-400"}`}>
                {lastAnswerResult.correct
                  ? isAr ? "إجابة صحيحة!" : "Correct Answer!"
                  : isAr ? "إجابة خاطئة" : "Wrong Answer"}
              </h2>

              <button
                onClick={() => setShowReview(true)}
                className="px-6 py-3 bg-gray-800 text-white rounded-xl hover:bg-gray-700 transition-colors"
              >
                {isAr ? "مراجعة السؤال" : "Review Question"}
              </button>
            </motion.div>
          )}

          {/* Results Phase */}
          {status === GameStatus.Results && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="py-8"
            >
              <h2 className="text-3xl font-bold text-center mb-8">
                {isAr ? "النتائج" : "Results"}
              </h2>

              <div className="space-y-3">
                {[...players]
                  .sort((a, b) => b.score - a.score)
                  .map((player, index) => (
                    <motion.div
                      key={player.userId}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`flex items-center gap-4 p-4 rounded-2xl ${
                        index === 0
                          ? "bg-amber-500/20 border border-amber-500/50"
                          : index === 1
                          ? "bg-gray-400/20 border border-gray-400/50"
                          : index === 2
                          ? "bg-orange-500/20 border border-orange-500/50"
                          : "bg-gray-800"
                      }`}
                    >
                      <span className="text-2xl font-bold w-8">
                        {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}`}
                      </span>
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center font-bold text-black">
                        {player.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold">{player.username}</p>
                        <p className="text-sm text-gray-400">
                          {isAr ? "نقاط" : `${player.score} points`}
                        </p>
                      </div>
                      <span className="text-2xl font-bold text-amber-400">
                        {player.score}
                      </span>
                    </motion.div>
                  ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Question Review Modal */}
      {showReview && question && lastAnswerResult && (
        <QuestionReview
          question={question}
          correctIndex={lastAnswerResult.correctIndex}
          explanation={{
            en: question.explanationEn,
            ar: question.explanationAr,
          }}
          playerAnswers={{}}
          isOpen={showReview}
          onClose={() => setShowReview(false)}
        />
      )}

      {/* Emote System */}
      {canParticipate && <EmoteSystem />}

      {/* CSS Animations */}
      <style jsx global>{`
        @keyframes chaos-shake {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          10% { transform: translate(-3px, -3px) rotate(-1deg); }
          20% { transform: translate(3px, 3px) rotate(1deg); }
          30% { transform: translate(-3px, 3px) rotate(-1deg); }
          40% { transform: translate(3px, -3px) rotate(1deg); }
          50% { transform: translate(-2px, 2px) rotate(0deg); }
          60% { transform: translate(2px, -2px) rotate(-1deg); }
          70% { transform: translate(-1px, 1px) rotate(1deg); }
          80% { transform: translate(1px, -1px) rotate(0deg); }
          90% { transform: translate(-2px, -2px) rotate(-1deg); }
        }
        
        @keyframes glitch-sweep {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function DramaPopup({ drama, language, onStartVoting, pending }: {
  drama: { id: string; type: string; playerId: string; username: string };
  language: "en" | "ar";
  onStartVoting?: () => void;
  pending: boolean;
}) {
  const isAr = language === "ar";
  
  const dramaMessages: Record<string, { en: string; ar: string; icon: string }> = {
    TAB_LEFT: { en: "left the game during question", ar: "غادر اللعبة أثناء السؤال", icon: "⚠️" },
    INACTIVITY: { en: "is inactive", ar: "غير نشط", icon: "💤" },
    SWITCHED_APP: { en: "switched to another app", ar: "انتقل لتطبيق آخر", icon: "📱" },
    SUSPICIOUS_BEHAVIOR: { en: "showed suspicious behavior", ar: "أظهر سلوكاً مشبوهاً", icon: "🕵️" },
  };
  
  const msg = dramaMessages[drama.type] || { en: "drama detected", ar: "تم اكتشاف دراما", icon: "🌀" };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -30, scale: 0.9 }}
      className="mb-4"
      style={{
        background: "linear-gradient(135deg, #2d1818 0%, #1a0f0f 100%)",
        border: "2px solid #ff4757",
        borderRadius: 16,
        padding: 20,
        boxShadow: "0 20px 60px rgba(255, 71, 87, 0.4)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <span style={{ fontSize: "2rem" }}>{msg.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ color: "#ff6b81", fontWeight: 800, fontSize: "1.1rem" }}>
            🚨 {isAr ? "حدث درامي!" : "DRAMA EVENT!"}
          </div>
          <div style={{ color: "#fff", fontSize: "0.95rem" }}>
            <strong>{drama.username}</strong> {msg[language]}
          </div>
        </div>
      </div>
      
      {onStartVoting && (
        <button type="button" className="btn btn-secondary" disabled={pending} onClick={onStartVoting}>
          {isAr ? "ابدأ التصويت" : "Start voting"}
        </button>
      )}
    </motion.div>
  );
}

function VotingInterface({ voting, language, onVote, hasVoted, canVote, pending, seconds }: {
  voting: NonNullable<ChaosClientSnapshot["votingSession"]>;
  language: "en" | "ar";
  onVote: (vote: ChaosVote) => void;
  hasVoted: boolean;
  canVote: boolean;
  pending: boolean;
  seconds: number;
}) {
  const isAr = language === "ar";
  
  const options = {
    FORGIVE: { emoji: "😇", label: { en: "FORGIVE", ar: "سامح" }, color: "#00e676" },
    REDUCE_SCORE: { emoji: "👎", label: { en: "REDUCE SCORE", ar: "خفض النقاط" }, color: "#ff9800" },
  } as const;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="mb-4"
    >
      <div 
        className="p-4 rounded-2xl"
        style={{
          background: "linear-gradient(135deg, #2d1f3d 0%, #1a0f1a 100%)",
          border: "2px solid #ff00ff",
        }}
      >
        <h3 className="text-xl font-bold text-center mb-2" style={{ color: "#ff00ff" }}>
          🗳️ {isAr ? "التصويت على العقاب" : "VOTE ON PUNISHMENT"}
        </h3>
        
        <p className="text-center text-gray-300 mb-6">
          {isAr ? `هل يستحق ${voting.targetUsername} العقاب؟` : `Does ${voting.targetUsername} deserve punishment?`}
        </p>
        
        <div className="text-center mb-6">
          <span className="text-2xl font-bold text-amber-400">{seconds}s</span>
        </div>
        
        {hasVoted ? (
          <div className="text-center text-green-400 font-bold">
            ✅ {isAr ? "تم التصويت!" : "VOTE CAST!"}
          </div>
        ) : canVote ? (
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12 }}>
            {voting.options.map((vote) => {
              const opt = options[vote];
              return (
              <motion.button
                key={vote}
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={pending || seconds === 0}
                onClick={() => onVote(vote)}
                className="btn btn-secondary"
                style={{
                  background: "rgba(0,0,0,0.5)",
                  border: `2px solid ${opt.color}`,
                  color: opt.color,
                }}
              >
                <span className="text-2xl">{opt.emoji}</span>
                <span>{opt.label[language]}</span>
              </motion.button>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-gray-300">
            {isAr ? "يمكنك متابعة التصويت." : "You can watch the vote."}
          </p>
        )}
        
        <div className="mt-4 text-center text-sm text-gray-500">
          {isAr ? `الأصوات: ${voting.totalVotes}` : `Votes: ${voting.totalVotes}`}
        </div>
      </div>
    </motion.div>
  );
}

function TrapWarning({ trap, language, isTarget }: {
  trap: NonNullable<ChaosClientSnapshot["activeTrap"]>;
  language: "en" | "ar";
  isTarget: boolean;
}) {
  const isAr = language === "ar";
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="mb-4"
    >
      <div 
        className="p-4 rounded-2xl text-center"
        style={{
          background: "linear-gradient(135deg, #3d1f1f 0%, #1f0f0f 100%)",
          border: "3px solid #ff4757",
          boxShadow: "0 0 60px rgba(255, 71, 87, 0.6)",
        }}
      >
        <h3 className="text-xl font-bold text-red-400 mb-2">
          💀 {isAr ? "فخ نشط" : "Trap active"}
        </h3>
        <p className="text-white">
          {isTarget
            ? (isAr ? `أنت هدف فخ من المستوى ${trap.level}.` : `You are the target of a Level ${trap.level} trap.`)
            : (isAr ? `${trap.targetUsername} هو هدف فخ من المستوى ${trap.level}.` : `${trap.targetUsername} is the target of a Level ${trap.level} trap.`)}
        </p>
      </div>
    </motion.div>
  );
}

function EvaluatingTrap({ language }: { language: "en" | "ar" }) {
  const isAr = language === "ar";
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="mb-4 flex items-center justify-center"
    >
      <div className="text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="text-6xl mb-6"
        >
          🎲
        </motion.div>
        <h3 className="text-2xl font-bold text-amber-400 mb-2">
          🤔 {isAr ? "تقييم نتيجة الفخ..." : "Evaluating Trap Outcome..."}
        </h3>
        <p className="text-gray-400">
          {isAr ? "الفوضى تحدد المصير..." : "Chaos decides the fate..."}
        </p>
      </div>
    </motion.div>
  );
}

function TrapResult({ result, language, onClose }: {
  result: { outcome: string; title: string; emoji: string; color: string; message: string; heroUsername?: string };
  language: "en" | "ar";
  onClose: () => void;
}) {
  const isAr = language === "ar";
  
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5 }}
      className="mb-4 flex items-center justify-center"
    >
      <div 
        className="px-8 py-6 rounded-2xl text-center max-w-md"
        style={{
          background: "#1a0f0f",
          border: `3px solid ${result.color}`,
          boxShadow: `0 0 60px ${result.color}60`,
        }}
      >
        <div className="text-6xl mb-4">{result.emoji}</div>
        <h3 className="text-2xl font-bold mb-2" style={{ color: result.color }}>
          {result.title}
        </h3>
        <p className="text-white mb-4">{result.message}</p>
        
        {result.heroUsername && (
          <div className="bg-amber-500/20 border border-amber-500/50 rounded-xl p-3 mt-4">
            <p className="text-amber-400 font-bold">
              🦸 {result.heroUsername} {isAr ? "أنقذ الجميع!" : "saved everyone!"}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

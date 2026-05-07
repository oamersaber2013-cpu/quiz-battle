"use client";

import { useEffect, useState, useCallback } from "react";
import { useGameStore } from "@/store/gameStore";
import { motion, AnimatePresence } from "framer-motion";
import { GameStatus } from "@quiz-battle/shared";
import { RoundProgress } from "./RoundProgress";
import { QuestionReview } from "./QuestionReview";
import { EmoteSystem } from "./EmoteSystem";
import { useSound } from "@/hooks/useSound";
import { emitAnswer, emitChaosVote, emitChaosAnswer } from "@/lib/socket";

// ═══════════════════════════════════════════════════════════════════════════════
// CHAOS GAME COMPONENT - Full integration of CHAOS mode
// ═══════════════════════════════════════════════════════════════════════════════

export default function ChaosGame() {
  const {
    status,
    currentQuestion: question,
    currentRound,
    totalRounds,
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
    castChaosVote,
  } = useGameStore();

  const { play } = useSound();
  const isAr = language === "ar";
  const [showReview, setShowReview] = useState(false);
  const [answerMode, setAnswerMode] = useState<"SAFE" | "RISK">("SAFE");
  const [showChaosLog, setShowChaosLog] = useState(false);

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
    if (!gameId || status !== GameStatus.Question) return;
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Player left tab during active question - report drama!
        const { getSocket } = require("@/lib/socket");
        const socket = getSocket();
        socket.emit("chaos:drama", { gameId, type: "TAB_LEFT" });
        console.log("[CHAOS] Drama reported: left tab during question");
      }
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [gameId, status]);

  // Handle chaos voting
  const handleVote = useCallback((vote: "FORGIVE" | "REDUCE_SCORE" | "BLOCK_QUESTION") => {
    if (gameId && chaosState?.votingSession) {
      emitChaosVote(gameId, vote);
      castChaosVote(vote);
      play("click");
    }
  }, [gameId, chaosState, castChaosVote, play]);

  // Handle answer with mode selection
  const handleAnswer = useCallback((index: number) => {
    if (gameId && question) {
      useGameStore.getState().selectAnswer(index);
      emitChaosAnswer(gameId, question.id, index, answerMode);
      play("click");
    }
  }, [gameId, question, answerMode, play]);

  if (!question) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">{isAr ? "جاري التحميل..." : "Loading..."}</p>
      </div>
    );
  }

  const isEliminated = (index: number) => eliminatedOptions?.includes(index);
  const hasAnswered = selectedAnswer !== null;

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
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Chaos particles */}
          {Array.from({ length: Math.floor(chaosState.level / 10) }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-2xl"
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
      {chaosState && (
        <motion.div
          className="fixed top-20 left-4 z-50"
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
          className="fixed top-20 right-4 z-50 px-3 py-2 rounded-xl bg-gray-800/80 border border-purple-500/50 text-sm"
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
            className="fixed top-32 right-4 z-50 w-64 max-h-64 overflow-y-auto"
            style={{
              background: "rgba(0,0,0,0.9)",
              border: "1px solid rgba(255,0,255,0.3)",
              borderRadius: "12px",
              padding: "12px",
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

      {/* Round Progress */}
      <RoundProgress />

      {/* Main Game Area */}
      <div className="pt-24 pb-20 px-4 max-w-4xl mx-auto relative z-10">
        <AnimatePresence mode="wait">
          {/* Drama Event Popup */}
          {chaosState?.activeDrama && !chaosState.isVoting && (
            <DramaPopup 
              drama={chaosState.activeDrama} 
              language={language}
              onStartVoting={() => {}}
            />
          )}

          {/* Voting Interface */}
          {chaosState?.isVoting && chaosState.votingSession && (
            <VotingInterface
              voting={chaosState.votingSession}
              language={language}
              onVote={handleVote}
              hasVoted={chaosState.votingSession.hasVoted}
            />
          )}

          {/* Trap Warning */}
          {chaosState?.activeTrap && !chaosState.evaluatingTrap && (
            <TrapWarning 
              trap={chaosState.activeTrap} 
              language={language}
              isTarget={chaosState.activeTrap.isTarget}
            />
          )}

          {/* Evaluating Trap */}
          {chaosState?.evaluatingTrap && (
            <EvaluatingTrap language={language} />
          )}

          {/* Trap Result */}
          {chaosState?.lastTrapResult && (
            <TrapResult 
              result={chaosState.lastTrapResult} 
              language={language}
              onClose={() => useGameStore.getState().setTrapResult(null)}
            />
          )}

          {/* Question Phase */}
          {status === GameStatus.Question && !chaosState?.evaluatingTrap && !chaosState?.lastTrapResult && (
            <motion.div
              key="question"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Answer Mode Selection (only in trap rounds) */}
              {chaosState?.activeTrap && (
                <div className="mb-4 flex justify-center gap-4">
                  <button
                    onClick={() => setAnswerMode("SAFE")}
                    className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                      answerMode === "SAFE"
                        ? "bg-green-500 text-white"
                        : "bg-gray-700 text-gray-400"
                    }`}
                  >
                    🛡️ {isAr ? "آمن" : "SAFE"}
                  </button>
                  <button
                    onClick={() => setAnswerMode("RISK")}
                    className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                      answerMode === "RISK"
                        ? "bg-red-500 text-white"
                        : "bg-gray-700 text-gray-400"
                    }`}
                  >
                    ⚔️ {isAr ? "محفوف بالمخاطر" : "RISK"}
                  </button>
                </div>
              )}

              {/* Timer */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">
                    {isAr ? "الوقت المتبقي" : "Time Remaining"}
                  </span>
                  <span className={`text-2xl font-bold ${timeLeft <= 5 ? "text-red-500" : "text-amber-400"}`}>
                    {timeLeft}s
                    {chaosState?.activeTrap?.isTarget && chaosState.activeTrap.advantages && (
                      <span className="text-green-400 text-sm ml-2">
                        +{chaosState.activeTrap.advantages.timeBonus}s
                      </span>
                    )}
                  </span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: "100%" }}
                    animate={{ width: `${(timeLeft / Math.max(1, question.timeLimit)) * 100}%` }}
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
                {chaosState?.activeTrap && (
                  <div className="text-red-400 text-center mb-4 font-bold flex items-center justify-center gap-2">
                    💀 {isAr ? "فخ نشط!" : "TRAP ACTIVE!"}
                  </div>
                )}
                <p className="text-xl md:text-2xl font-bold text-white text-center leading-relaxed">
                  {isAr ? (question.textAr || question.text) : (question.textEn || question.text)}
                </p>
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {((isAr ? (question.optionsAr || question.options) : (question.optionsEn || question.options)) || []).map((option: string, index: number) => {
                  const eliminated = isEliminated(index);
                  const selected = selectedAnswer === index;

                  return (
                    <motion.button
                      key={index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: eliminated ? 0.3 : 1, scale: 1 }}
                      whileHover={!eliminated && !hasAnswered ? { scale: 1.02 } : {}}
                      whileTap={!eliminated && !hasAnswered ? { scale: 0.98 } : {}}
                      disabled={eliminated || hasAnswered}
                      onClick={() => handleAnswer(index)}
                      className={`p-6 rounded-2xl border-2 font-bold text-lg transition-all ${
                        eliminated
                          ? "border-gray-800 bg-gray-900 text-gray-600 cursor-not-allowed"
                          : selected
                          ? "border-purple-500 bg-purple-500/20 text-purple-400"
                          : chaosState?.activeTrap
                          ? "border-red-500/50 bg-red-500/10 text-white hover:border-red-500"
                          : "border-gray-700 bg-gray-800 text-white hover:border-purple-500/50"
                      }`}
                    >
                      <span className="inline-block w-8 h-8 rounded-full bg-gray-700 text-center leading-8 mr-3 text-sm">
                        {String.fromCharCode(65 + index)}
                      </span>
                      {option}
                    </motion.button>
                  );
                })}
              </div>

              {/* PowerUp Buttons */}
              <div className="mt-6 flex justify-center gap-3">
                {currentPlayer?.powerUpInventory.map((powerUp, index) => (
                  <motion.button
                    key={index}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => play("powerup")}
                    className="px-4 py-2 bg-purple-500/20 border border-purple-500/50 rounded-xl text-purple-400 font-bold text-sm hover:bg-purple-500/30 transition-colors"
                  >
                    {powerUp}
                  </motion.button>
                ))}
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
      <EmoteSystem />

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

function DramaPopup({ drama, language, onStartVoting }: { 
  drama: { id: string; type: string; playerId: string; username: string };
  language: "en" | "ar";
  onStartVoting: () => void;
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
      className="fixed top-20 left-1/2 -translate-x-1/2 z-50"
      style={{
        background: "linear-gradient(135deg, #2d1818 0%, #1a0f0f 100%)",
        border: "2px solid #ff4757",
        borderRadius: 16,
        padding: 20,
        minWidth: 320,
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
      
      <div style={{ color: "#ffaa88", fontSize: "0.85rem", marginBottom: 12, textAlign: "center" }}>
        {isAr ? "الفوضى تتزايد..." : "Chaos is rising..."}
      </div>
    </motion.div>
  );
}

function VotingInterface({ voting, language, onVote, hasVoted }: {
  voting: { targetUsername: string; timeRemaining: number; totalVotes: number };
  language: "en" | "ar";
  onVote: (vote: "FORGIVE" | "REDUCE_SCORE" | "BLOCK_QUESTION") => void;
  hasVoted: boolean;
}) {
  const isAr = language === "ar";
  
  const options = [
    { id: "FORGIVE", emoji: "😇", label: { en: "FORGIVE", ar: "سامح" }, color: "#00e676" },
    { id: "REDUCE_SCORE", emoji: "👎", label: { en: "REDUCE SCORE", ar: "خفض النقاط" }, color: "#ff9800" },
    { id: "BLOCK_QUESTION", emoji: "🚫", label: { en: "BLOCK NEXT", ar: "منع السؤال القادم" }, color: "#ff4757" },
  ] as const;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
    >
      <div 
        className="p-6 rounded-2xl max-w-md w-full mx-4"
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
          <span className="text-3xl font-bold text-amber-400">{voting.timeRemaining}s</span>
        </div>
        
        {hasVoted ? (
          <div className="text-center text-green-400 font-bold">
            ✅ {isAr ? "تم التصويت!" : "VOTE CAST!"}
          </div>
        ) : (
          <div className="space-y-3">
            {options.map((opt) => (
              <motion.button
                key={opt.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onVote(opt.id)}
                className="w-full p-4 rounded-xl font-bold flex items-center gap-3 transition-all"
                style={{
                  background: "rgba(0,0,0,0.5)",
                  border: `2px solid ${opt.color}`,
                  color: opt.color,
                }}
              >
                <span className="text-2xl">{opt.emoji}</span>
                <span>{opt.label[language]}</span>
              </motion.button>
            ))}
          </div>
        )}
        
        <div className="mt-4 text-center text-sm text-gray-500">
          {isAr ? `الأصوات: ${voting.totalVotes}` : `Votes: ${voting.totalVotes}`}
        </div>
      </div>
    </motion.div>
  );
}

function TrapWarning({ trap, language, isTarget }: {
  trap: { targetUsername: string; level: number; advantages?: { timeBonus: number; eliminatedOptions: number } };
  language: "en" | "ar";
  isTarget: boolean;
}) {
  const isAr = language === "ar";
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none"
    >
      <div 
        className="px-8 py-6 rounded-2xl text-center"
        style={{
          background: "linear-gradient(135deg, #3d1f1f 0%, #1f0f0f 100%)",
          border: "3px solid #ff4757",
          boxShadow: "0 0 60px rgba(255, 71, 87, 0.6)",
        }}
      >
        <div className="text-5xl mb-4">💀</div>
        <h3 className="text-2xl font-bold text-red-400 mb-2">
          {isAr ? "فخ نشط!" : "TRAP ACTIVE!"}
        </h3>
        <p className="text-white mb-4">
          {isAr 
            ? `${trap.targetUsername} محاصر في فخ مستوى ${trap.level}!`
            : `${trap.targetUsername} is trapped in a Level ${trap.level} trap!`
          }
        </p>
        
        {isTarget && trap.advantages && (
          <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-3 mt-4">
            <p className="text-green-400 font-bold text-sm">
              🎁 {isAr ? "مميزاتك كهدف:" : "Your target advantages:"}
            </p>
            <p className="text-green-300 text-xs mt-1">
              +{trap.advantages.timeBonus}s {isAr ? "وقت إضافي" : "extra time"}
              {trap.advantages.eliminatedOptions > 0 && (
                <span> • {trap.advantages.eliminatedOptions} {isAr ? "إجابة خاطئة محذوفة" : "wrong answer removed"}</span>
              )}
            </p>
          </div>
        )}
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
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

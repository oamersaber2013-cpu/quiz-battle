"use client";
import { useGameStore } from "@/store/gameStore";
import { getSocket } from "@/lib/socket";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback, useEffect } from "react";
import { emitConquestAttack } from "@/lib/socket";
import { WorldMap, SoundEffects, VICTORY_STATEMENTS, DEFEAT_STATEMENTS, TERRITORIES } from "./WorldMap";

// Sound effect instance
const soundEffects = new SoundEffects();

export function ConquestGame() {
  const {
    conquestState,
    userId,
    language,
    players,
    gameId,
    addToast
  } = useGameStore();

  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);

  // Handle battle results with sounds and statements
  useEffect(() => {
    const socket = getSocket();
    
    const handleDuelResult = (data: { attackerWon: boolean; tieBreaker?: boolean }) => {
      if (data.tieBreaker) return;
      
      const isAr = language === "ar";
      
      if (data.attackerWon) {
        // Victory!
        soundEffects.playVictory();
        const statement = VICTORY_STATEMENTS[Math.floor(Math.random() * VICTORY_STATEMENTS.length)];
        addToast("success", isAr ? statement.ar : statement.en);
      } else {
        // Defeat
        soundEffects.playDefeat();
        const statement = DEFEAT_STATEMENTS[Math.floor(Math.random() * DEFEAT_STATEMENTS.length)];
        addToast("error", isAr ? statement.ar : statement.en);
      }
    };
    
    socket.on("conquest:duelResult", handleDuelResult);
    return () => {
      socket.off("conquest:duelResult", handleDuelResult);
    };
  }, [addToast, language]);

  if (!conquestState) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="text-4xl mb-4"
          >
            ⚔️
          </motion.div>
          <h2 className="text-xl font-bold">{language === "ar" ? "جاري التحميل..." : "Loading..."}</h2>
        </div>
      </div>
    );
  }

  const isAr = language === "ar";
  const {
    territories,
    fortHealth,
    fortTerritoryId,
    turnOrder,
    currentTurnIndex,
    phase,
    eliminatedPlayers,
    currentBattle,
    rebuildSession,
    draftPhase
  } = conquestState;
  const territoryOwners = territories as Record<string, string | null>;
  const normalizedFortTerritoryId = Object.fromEntries(
    Object.entries(fortTerritoryId).map(([pid, tid]) => [pid, String(tid)])
  ) as Record<string, string>;

  const currentTurnPlayerId = turnOrder[currentTurnIndex];
  const isMyTurn = currentTurnPlayerId === userId;
  const isBattling = currentBattle && (currentBattle.attackerId === userId || currentBattle.defenderId === userId);
  const isRebuilding = rebuildSession && rebuildSession.playerId === userId;

  const handleTerritoryClick = useCallback((tid: string) => {
    if (phase === "draft_selection") {
      if (draftPhase?.pickOrder[draftPhase.currentPickerIndex] !== userId) return;
      if (!draftPhase?.availableTerritories?.includes(tid)) return;
      getSocket().emit("conquest:selectDraftTerritory", { gameId: gameId!, territoryId: tid });
      return;
    }
    if (!isMyTurn || phase !== "select_target") return;
    const ownerId = territoryOwners[tid];
    if (ownerId === userId) return;
    setSelectedTarget(tid);
  }, [phase, draftPhase, territoryOwners, isMyTurn, userId, gameId]);

  const handleAttack = async () => {
    if (selectedTarget === null || !gameId) return;
    await emitConquestAttack(gameId, selectedTarget);
    setSelectedTarget(null);
  };

  const handleRebuild = () => {
    if (!gameId) return;
    getSocket().emit("conquest:rebuild", { gameId });
  };

  const [draftStartTime, setDraftStartTime] = useState<number>(Date.now());
  useEffect(() => {
    if (phase === "draft" && draftPhase?.question) setDraftStartTime(Date.now());
  }, [phase, draftPhase?.question?.id]);

  const handleAnswer = (index: number) => {
    if (!gameId) return;
    if (phase === "draft") {
      getSocket().emit("conquest:draftAnswer", { gameId, answerIndex: index, responseTimeMs: Date.now() - draftStartTime });
    } else if (isBattling) {
      getSocket().emit("conquest:duelAnswer", { gameId, answerIndex: index });
    } else if (isRebuilding) {
      getSocket().emit("conquest:rebuildAnswer", { gameId, answerIndex: index });
    }
  };

  const getPlayerDetails = (pid: string) => players.find(p => p.userId === pid);

  // Colors for players
  const playerColors = ["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#a855f7", "#ec4899", "#f97316", "#06b6d4"];
  const getColor = (pid: string) => {
    const idx = players.findIndex(p => p.userId === pid);
    return playerColors[idx % playerColors.length] || "#94a3b8";
  };

  return (
    <div className="flex flex-col w-full h-[calc(100vh-80px)] bg-slate-900 text-white relative overflow-hidden font-sans">
      
      {/* ─── Top Player Bar ─── */}
      <div className="flex items-center justify-center gap-3 p-3 z-10" style={{
        background: 'linear-gradient(180deg, #2d3748 0%, #1a202c 100%)',
        borderBottom: '3px solid #4a5568'
      }}>
        {players.map((p) => {
          const isTurn = p.userId === currentTurnPlayerId;
          const isElim = eliminatedPlayers.includes(p.userId);
          const fHealth = fortHealth[p.userId] ?? 3;
          const color = getColor(p.userId);
          
          return (
            <div key={p.userId} style={{
              display: 'flex',
              alignItems: 'center',
              background: 'linear-gradient(180deg, #8b7355 0%, #6b5344 100%)',
              borderRadius: '8px',
              padding: '8px 16px',
              border: isTurn ? '3px solid #fbbf24' : '2px solid #5a4a2a',
              boxShadow: isTurn ? '0 0 15px rgba(251, 191, 36, 0.5)' : '0 4px 8px rgba(0,0,0,0.3)',
              minWidth: '180px',
              transform: isTurn ? 'scale(1.05)' : 'scale(1)',
              transition: 'all 0.3s ease',
              opacity: isElim ? 0.5 : 1
            }}>
              {/* Pirate Avatar */}
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '6px',
                border: '2px solid #3d2515',
                background: 'linear-gradient(135deg, #d4a574 0%, #8b6914 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                marginRight: '12px',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)'
              }}>
                {isElim ? "💀" : "🏴‍☠️"}
              </div>
              
              {/* Player Info */}
              <div style={{ flex: 1 }}>
                <div style={{
                  fontWeight: 'bold',
                  color: 'white',
                  fontSize: '14px',
                  textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                  marginBottom: '4px'
                }}>
                  {p.username}
                </div>
                <div style={{
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: color
                }}>
                  {p.score || 0}
                </div>
                {/* Fort Health Dots */}
                <div style={{ display: 'flex', gap: '3px', marginTop: '4px' }}>
                  {[1,2,3].map(i => (
                    <div key={i} style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: i <= fHealth ? '#fbbf24' : '#4a5568',
                      border: '1px solid #2d3748',
                      boxShadow: i <= fHealth ? '0 0 5px #fbbf24' : 'none'
                    }} />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Main Map Area ─── */}
      <div className="flex-1 relative flex items-center justify-center p-8" style={{ 
        background: 'linear-gradient(180deg, #5a9aa8 0%, #4a8a98 50%, #3d7a8c 100%)',
      }}>
        {/* WorldMap Component with geographic continent shapes */}
        <WorldMap 
          territories={territoryOwners}
          fortTerritoryId={normalizedFortTerritoryId}
          playerColors={players.reduce((acc, p) => ({ ...acc, [p.userId]: getColor(p.userId) }), {} as Record<string, string>)}
          currentPlayerId={userId ?? ""}
          onTerritoryClick={handleTerritoryClick}
          selectedTarget={selectedTarget}
          isMyTurn={isMyTurn}
          phase={phase}
        />

        {/* ─── Action Panel ─── */}
        {isMyTurn && phase === "select_target" && (
          <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4 bg-slate-900/90 p-4 rounded-2xl border border-slate-700 shadow-2xl backdrop-blur-md z-40">
            {selectedTarget !== null ? (
              <div className="flex flex-col items-center gap-3">
                <div className="text-lg">
                  {isAr ? "مهاجمة" : "Attack"} <span className="font-bold text-amber-400">
                    {isAr ? TERRITORIES.find(t=>t.id===selectedTarget)?.nameAr : TERRITORIES.find(t=>t.id===selectedTarget)?.name}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={handleAttack} 
                    className="bg-red-600 hover:bg-red-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-xl font-bold transition flex items-center gap-2"
                  >
                    ⚔️ {isAr ? "هجوم!" : "Attack!"}
                  </button>
                  <button onClick={() => setSelectedTarget(null)} className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-xl">
                    {isAr ? "إلغاء" : "Cancel"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-6">
                <div className="text-xl font-bold text-amber-400 flex items-center gap-2">
                  🗺️ {isAr ? "دورك! اختر أرضاً للهجوم" : "Your Turn! Select a territory to attack"}
                </div>
                {(fortHealth[userId] ?? 3) < 3 && (
                  <button onClick={handleRebuild} className="bg-amber-600 hover:bg-amber-500 text-white px-6 py-2 rounded-xl font-bold transition flex items-center gap-2 shadow-lg shadow-amber-900/50">
                    🏰 {isAr ? "إعادة بناء الحصن" : "Rebuild Fort"}
                  </button>
                )}
              </div>
            )}
          </motion.div>
        )}

        {phase === "draft_selection" && (
          <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4 bg-slate-900/90 p-4 rounded-2xl border border-amber-500 shadow-2xl backdrop-blur-md z-40">
            <div className="flex items-center gap-6">
              <div className="text-xl font-bold text-amber-400 flex items-center gap-2">
                {draftPhase?.pickOrder[draftPhase.currentPickerIndex] === userId 
                  ? (isAr ? "🗺️ دورك لاختيار قاعدة!" : "🗺️ Your Turn! Select a starting base")
                  : (isAr ? `ننتظر ${getPlayerDetails(draftPhase?.pickOrder[draftPhase?.currentPickerIndex || 0] || "")?.username} ليختار` : `Waiting for ${getPlayerDetails(draftPhase?.pickOrder[draftPhase?.currentPickerIndex || 0] || "")?.username} to pick`)}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* ─── Battle / Draft Overlay ─── */}
      <AnimatePresence>
        {(currentBattle || rebuildSession || (phase === "draft" && draftPhase?.question)) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-6 backdrop-blur-md">
            
            {/* Duel Header */}
            {currentBattle && (
              <div className="flex items-center gap-12 mb-12">
                <div className="text-center">
                  <div className="text-6xl mb-4">🏴‍☠️</div>
                  <div className="text-2xl font-bold" style={{ color: getColor(currentBattle.attackerId) }}>{getPlayerDetails(currentBattle.attackerId)?.username}</div>
                  <div className="text-red-400 font-bold">{isAr ? "المهاجم" : "Attacker"}</div>
                </div>
                <div className="text-5xl font-black text-amber-500 animate-pulse">VS</div>
                <div className="text-center">
                  <div className="text-6xl mb-4">🏰</div>
                  <div className="text-2xl font-bold" style={{ color: getColor(currentBattle.defenderId) }}>{getPlayerDetails(currentBattle.defenderId)?.username}</div>
                  <div className="text-blue-400 font-bold">{isAr ? "المدافع" : "Defender"}</div>
                </div>
              </div>
            )}

            {/* Question Card */}
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-3xl bg-slate-800 rounded-3xl p-8 border-2 border-amber-500/30 shadow-2xl shadow-amber-500/10">
              <div className="text-center mb-8">
                <span className="bg-amber-500/20 text-amber-400 px-4 py-1 rounded-full text-sm font-bold uppercase tracking-wider">
                  {phase === "draft" ? (isAr ? "توزيع القواعد" : "Draft Phase") : rebuildSession ? (isAr ? "سؤال البناء" : "Rebuild Question") : (isAr ? "سؤال المعركة" : "Battle Question")}
                </span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 leading-tight">
                {currentBattle?.question.text || rebuildSession?.question.text || draftPhase?.question?.text}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(currentBattle?.question.options || rebuildSession?.question.options || draftPhase?.question?.options || []).map((opt: string, i: number) => {
                  const amIActive = isBattling || isRebuilding || phase === "draft";
                  const didIAnswer = currentBattle ? (currentBattle.attackerId === userId ? currentBattle.attackerAnswered : currentBattle.defenderAnswered) : rebuildSession ? rebuildSession.answered : (phase === "draft" ? !!draftPhase?.answered : false); // Note: we need to check if user answered in draft. For now we use the fact that answer is sent
                  const userHasAnsweredDraft = phase === "draft" && draftPhase?.answered && false; // We don't have user specific answer state in draftPhase client state, so we just let them click once and disable it locally or rely on server to ignore. Actually, let's disable on click if we add local state.
                  
                  return (
                    <button
                      key={i}
                      disabled={!amIActive || didIAnswer}
                      onClick={(e) => {
                        handleAnswer(i);
                        (e.target as HTMLButtonElement).disabled = true;
                      }}
                      className={`p-6 rounded-2xl text-xl font-bold transition-all duration-300 border-2 
                        ${amIActive && !didIAnswer 
                          ? 'border-slate-600 hover:border-amber-400 hover:bg-slate-700 active:scale-95 bg-slate-800' 
                          : 'border-slate-700 bg-slate-800/50 opacity-50 cursor-not-allowed'}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>

              {((isBattling && currentBattle && ((currentBattle.attackerId === userId && currentBattle.attackerAnswered) || (currentBattle.defenderId === userId && currentBattle.defenderAnswered))) || (isRebuilding && rebuildSession?.answered) || (phase === "draft" && draftPhase?.answered === draftPhase?.totalPlayers)) && (
                <div className="mt-8 text-center text-amber-400 font-bold animate-pulse">
                  {phase === "draft" ? (isAr ? "في انتظار بقية اللاعبين..." : "Waiting for other players...") : (isAr ? "في انتظار الخصم..." : "Waiting for opponent...")}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

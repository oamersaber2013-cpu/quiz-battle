"use client";

import { useGameStore } from "@/store/gameStore";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback, useMemo } from "react";
import { emitInvasionSelectTerritory } from "@/lib/socket";

const PLAYER_COLORS = [
  "#ef4444", // red
  "#3b82f6", // blue
  "#22c55e", // green
  "#eab308", // yellow
  "#a855f7", // purple
  "#f97316", // orange
  "#06b6d4", // cyan
  "#ec4899", // pink
];

const T = {
  round: { en: "Round", ar: "الجولة" },
  ranking: { en: "Ranking", ar: "الترتيب" },
  selecting: { en: "Selecting", ar: "يختار" },
  yourTurn: { en: "Your Turn!", ar: "دورك!" },
  pickTerritory: { en: "Pick a territory", ar: "اختر إقليماً" },
  troops: { en: "troops", ar: "جندي" },
  neutral: { en: "Neutral", ar: "محايد" },
  waiting: { en: "Waiting...", ar: "في الانتظار..." },
  gameOver: { en: "Invasion Complete!", ar: "انتهى الغزو!" },
  winner: { en: "Winner", ar: "الفائز" },
  ownedBy: { en: "Owned by", ar: "يملكه" },
};

export function InvasionGame() {
  const {
    invasionState,
    userId,
    language,
    players,
    gameId,
    currentQuestion,
    timeLeft,
    selectedAnswer,
    addToast,
  } = useGameStore();

  const [selectedTerritory, setSelectedTerritory] = useState<number | null>(null);
  const isAr = language === "ar";

  const playerColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (players) {
      players.forEach((p, i) => {
        map[p.userId] = PLAYER_COLORS[i % PLAYER_COLORS.length];
      });
    }
    return map;
  }, [players]);

  const handleTerritoryClick = useCallback(
    (territoryId: number) => {
      if (!invasionState || !gameId) return;
      if (invasionState.phase !== "selection") return;
      if (invasionState.currentTurn !== userId) return;

      const selectable = invasionState.selectableTerritories || [];
      if (!selectable.includes(territoryId)) {
        addToast("error", isAr ? "لا يمكن اختيار هذا الإقليم" : "Cannot select this territory");
        return;
      }

      setSelectedTerritory(territoryId);
      emitInvasionSelectTerritory(gameId, territoryId);
    },
    [invasionState, gameId, userId, isAr, addToast]
  );

  if (!invasionState) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="text-4xl mb-4"
          >
            🌍
          </motion.div>
          <h2 className="text-xl font-bold">{isAr ? "جاري التحميل..." : "Loading..."}</h2>
        </div>
      </div>
    );
  }

  const { territories, phase, currentRound, totalRounds, lastRanking, currentTurn, picksRemaining } =
    invasionState;

  const currentPlayer = players?.find((p) => p.userId === currentTurn);
  const isMyTurn = currentTurn === userId;

  return (
    <div className="w-full" style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* Header Bar */}
      <div className="glass-card p-4 mb-4 flex items-center justify-between">
        <div>
          <div className="text-muted text-sm">
            {T.round[isAr ? "ar" : "en"]} {currentRound} / {totalRounds}
          </div>
          <div className="font-bold text-lg capitalize">{phase}</div>
        </div>
        <div className="text-right">
          {phase === "selection" && currentPlayer && (
            <div>
              <span
                className="font-bold"
                style={{ color: playerColorMap[currentPlayer.userId] || "white" }}
              >
                {isMyTurn ? T.yourTurn[isAr ? "ar" : "en"] : currentPlayer.username}
              </span>
              {picksRemaining > 0 && (
                <div className="text-xs text-muted">
                  {picksRemaining} {isAr ? "اختيارات متبقية" : "picks remaining"}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* World Map */}
      <div
        className="relative w-full rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #0c4a6e 0%, #082f49 40%, #064e3b 70%, #14532d 100%)",
          aspectRatio: "2 / 1",
          boxShadow: "0 20px 60px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.08)",
        }}
      >
        {/* Grid lines for map feel */}
        <svg className="absolute inset-0 w-full h-full opacity-10" preserveAspectRatio="none">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Territories */}
        <svg
          viewBox="0 0 250 150"
          className="absolute inset-0 w-full h-full"
          style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }}
        >
          {territories.map((t) => {
            const isSelectable =
              phase === "selection" &&
              isMyTurn &&
              (invasionState.selectableTerritories || []).includes(Number(t.id));
            const ownerColor = t.ownerId ? playerColorMap[t.ownerId] : null;

            return (
              <g
                key={t.id}
                onClick={() => handleTerritoryClick(Number(t.id))}
                style={{
                  cursor: isSelectable ? "pointer" : "default",
                }}
              >
                {/* Territory shape */}
                <path
                  d={t.path}
                  fill={ownerColor || "rgba(100,116,139,0.3)"}
                  stroke={isSelectable ? "#fbbf24" : ownerColor ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)"}
                  strokeWidth={isSelectable ? 2 : 0.5}
                  style={{
                    transition: "all 0.3s ease",
                    filter: isSelectable ? "drop-shadow(0 0 8px rgba(251,191,36,0.5))" : "none",
                  }}
                />

                {/* Territory center dot + label */}
                <circle
                  cx={t.center.x}
                  cy={t.center.y}
                  r={t.troopCount > 0 ? 6 : 3}
                  fill={ownerColor || "#64748b"}
                  stroke="white"
                  strokeWidth={1}
                  opacity={0.9}
                />

                {/* Troop count */}
                {t.troopCount > 0 && (
                  <text
                    x={t.center.x}
                    y={t.center.y + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize="5"
                    fontWeight="bold"
                    style={{ pointerEvents: "none" }}
                  >
                    {t.troopCount}
                  </text>
                )}

                {/* Territory name */}
                <text
                  x={t.center.x}
                  y={t.center.y + 12}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.7)"
                  fontSize="4"
                  style={{ pointerEvents: "none" }}
                >
                  {isAr ? t.nameAr : t.name}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Phase overlay */}
        <AnimatePresence mode="wait">
          {phase === "ranking" && lastRanking && lastRanking.length > 0 && (
            <motion.div
              key="ranking"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
            >
              <div className="glass-card p-6 max-w-md w-full mx-4">
                <h3 className="text-xl font-bold text-center mb-4">
                  {T.ranking[isAr ? "ar" : "en"]}
                </h3>
                <div className="space-y-2">
                  {lastRanking.map((r, i) => {
                    const p = players?.find((pl) => pl.userId === r.playerId);
                    const color = p ? playerColorMap[p.userId] : "#fff";
                    return (
                      <div
                        key={r.playerId}
                        className="flex items-center gap-3 p-3 rounded-xl"
                        style={{
                          background: i === 0 ? "rgba(251,191,36,0.1)" : "rgba(255,255,255,0.03)",
                          border: i === 0 ? "1px solid rgba(251,191,36,0.3)" : "1px solid transparent",
                        }}
                      >
                        <span className="font-bold w-6 text-center">#{i + 1}</span>
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ background: color }}
                        />
                        <div className="flex-1">
                          <span className="font-bold">{p?.username || r.playerId}</span>
                          <span className="text-xs text-muted ml-2">
                            {r.picks} {isAr ? "اختيار" : "pick"}
                            {r.responseTimeMs > 0 && ` · ${(r.responseTimeMs / 1000).toFixed(1)}s`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {phase === "selection" && isMyTurn && (
            <motion.div
              key="selection-hint"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute top-4 left-1/2 -translate-x-1/2"
            >
              <div
                className="px-4 py-2 rounded-full font-bold text-sm"
                style={{
                  background: "rgba(251,191,36,0.9)",
                  color: "black",
                  boxShadow: "0 4px 20px rgba(251,191,36,0.4)",
                }}
              >
                {T.pickTerritory[isAr ? "ar" : "en"]}
              </div>
            </motion.div>
          )}

          {phase === "ended" && (
            <motion.div
              key="ended"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}
            >
              <div className="glass-card p-8 text-center max-w-md mx-4">
                <div className="text-5xl mb-4">🏆</div>
                <h2 className="text-2xl font-black mb-2">{T.gameOver[isAr ? "ar" : "en"]}</h2>
                <p className="text-muted mb-6">
                  {T.winner[isAr ? "ar" : "en"]}: {" "}
                  <span className="font-bold text-amber-400">
                    {players?.find((p) => {
                      const myTerritories = territories.filter((t) => t.ownerId === p.userId);
                      const maxTerritories = Math.max(
                        ...players.map((pl) => territories.filter((t) => t.ownerId === pl.userId).length)
                      );
                      return myTerritories.length === maxTerritories;
                    })?.username || "???"}
                  </span>
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {players?.map((p) => {
                    const count = territories.filter((t) => t.ownerId === p.userId).length;
                    const color = playerColorMap[p.userId];
                    return (
                      <div
                        key={p.userId}
                        className="p-3 rounded-xl"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border: `1px solid ${color}44`,
                        }}
                      >
                        <div className="font-bold" style={{ color }}>
                          {p.username}
                        </div>
                        <div className="text-2xl font-black">{count}</div>
                        <div className="text-xs text-muted">
                          {isAr ? "إقليم" : "territories"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Territory Legend / Status */}
      <div className="glass-card p-4 mt-4">
        <div className="flex flex-wrap gap-4 items-center">
          {players?.map((p) => {
            const count = territories.filter((t) => t.ownerId === p.userId).length;
            const troops = territories
              .filter((t) => t.ownerId === p.userId)
              .reduce((sum, t) => sum + t.troopCount, 0);
            return (
              <div key={p.userId} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ background: playerColorMap[p.userId] }}
                />
                <span className="font-bold text-sm">{p.username}</span>
                <span className="text-xs text-muted">
                  {count} {isAr ? "إقليم" : "terr"} · {troops} {T.troops[isAr ? "ar" : "en"]}
                </span>
              </div>
            );
          })}
          <div className="flex items-center gap-2 ml-auto">
            <div className="w-4 h-4 rounded-full bg-slate-600" />
            <span className="text-xs text-muted">{T.neutral[isAr ? "ar" : "en"]}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

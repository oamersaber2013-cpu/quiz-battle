"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useGameStore } from "@/store/gameStore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GameMode, PowerUpType } from "@quiz-battle/shared";

// ═══════════════════════════════════════════════════════════════════════════════
// GAME STATISTICS PAGE - Player stats, history, and performance analytics
// ═══════════════════════════════════════════════════════════════════════════════

interface GameHistory {
  id: string;
  date: string;
  mode: GameMode;
  result: "win" | "loss" | "draw";
  score: number;
  rank: number;
  totalPlayers: number;
  duration: number; // minutes
  powerUpsUsed: PowerUpType[];
  correctAnswers: number;
  totalQuestions: number;
}

interface PlayerStats {
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  totalScore: number;
  averageScore: number;
  favoriteMode: GameMode;
  gamesByMode: Record<GameMode, number>;
  winsByMode: Record<GameMode, number>;
  powerUpUsage: Record<PowerUpType, number>;
  recentGames: GameHistory[];
}

const MOCK_STATS: PlayerStats = {
  totalGames: 47,
  wins: 28,
  losses: 15,
  draws: 4,
  winRate: 59.6,
  totalScore: 125_430,
  averageScore: 2_668,
  favoriteMode: GameMode.Chaos,
  gamesByMode: {
    [GameMode.Classic]: 20,
    [GameMode.Survival]: 6,
    [GameMode.Conquest]: 7,
    [GameMode.Chaos]: 9,
    [GameMode.Custom]: 5,
  },
  winsByMode: {
    [GameMode.Classic]: 13,
    [GameMode.Survival]: 3,
    [GameMode.Conquest]: 4,
    [GameMode.Chaos]: 5,
    [GameMode.Custom]: 3,
  },
  powerUpUsage: {
    [PowerUpType.Shield]: 45,
    [PowerUpType.FiftyFifty]: 32,
    [PowerUpType.Freeze]: 28,
    [PowerUpType.DoubleDown]: 41,
    [PowerUpType.Steal]: 19,
    [PowerUpType.DoublePick]: 15,
    [PowerUpType.Sandstorm]: 22,
    [PowerUpType.TimeWarp]: 12,
    [PowerUpType.Whole]: 8,
  },
  recentGames: [
    {
      id: "game_001",
      date: "2024-01-15",
      mode: GameMode.Chaos,
      result: "win",
      score: 3450,
      rank: 1,
      totalPlayers: 6,
      duration: 18,
      powerUpsUsed: [PowerUpType.Shield, PowerUpType.DoubleDown],
      correctAnswers: 12,
      totalQuestions: 15,
    },
    {
      id: "game_002",
      date: "2024-01-14",
      mode: GameMode.Conquest,
      result: "loss",
      score: 2100,
      rank: 3,
      totalPlayers: 8,
      duration: 25,
      powerUpsUsed: [PowerUpType.FiftyFifty, PowerUpType.Freeze],
      correctAnswers: 9,
      totalQuestions: 12,
    },
    {
      id: "game_003",
      date: "2024-01-13",
      mode: GameMode.Classic,
      result: "win",
      score: 4200,
      rank: 1,
      totalPlayers: 8,
      duration: 20,
      powerUpsUsed: [PowerUpType.Shield, PowerUpType.Sandstorm, PowerUpType.DoubleDown],
      correctAnswers: 14,
      totalQuestions: 15,
    },
    {
      id: "game_004",
      date: "2024-01-12",
      mode: GameMode.Survival,
      result: "loss",
      score: 1200,
      rank: 5,
      totalPlayers: 10,
      duration: 15,
      powerUpsUsed: [PowerUpType.Freeze],
      correctAnswers: 6,
      totalQuestions: 10,
    },
    {
      id: "game_005",
      date: "2024-01-11",
      mode: GameMode.Classic,
      result: "win",
      score: 2800,
      rank: 2,
      totalPlayers: 6,
      duration: 8,
      powerUpsUsed: [PowerUpType.DoubleDown, PowerUpType.TimeWarp],
      correctAnswers: 8,
      totalQuestions: 10,
    },
  ],
};

const MODE_CONFIG = {
  [GameMode.Classic]: { icon: "⚔️", color: "#6c63ff", label: { en: "Classic", ar: "كلاسيك" } },
  [GameMode.Survival]: { icon: "💀", color: "#ff4757", label: { en: "Survival", ar: "بقاء" } },
  [GameMode.Conquest]: { icon: "🌍", color: "#2ed573", label: { en: "Conquest", ar: "غزو" } },
  [GameMode.Chaos]: { icon: "😈", color: "#ff00ff", label: { en: "Chaos", ar: "فوضى" } },
  [GameMode.Custom]: { icon: "⚙️", color: "#9ca3af", label: { en: "Custom", ar: "مخصص" } },
};

const POWER_UP_ICONS: Record<PowerUpType, string> = {
  [PowerUpType.Shield]: "🛡️",
  [PowerUpType.FiftyFifty]: "✂️",
  [PowerUpType.Freeze]: "❄️",
  [PowerUpType.DoubleDown]: "💥",
  [PowerUpType.Steal]: "🦹",
  [PowerUpType.DoublePick]: "✌️",
  [PowerUpType.Sandstorm]: "🌪️",
  [PowerUpType.TimeWarp]: "⏳",
  [PowerUpType.Whole]: "🌀",
};

export default function StatsPage() {
  const router = useRouter();
  const { userId, username, language } = useGameStore();
  const isAr = language === "ar";
  const [stats] = useState<PlayerStats>(MOCK_STATS);
  const [activeTab, setActiveTab] = useState<"overview" | "history" | "powerups">("overview");

  useEffect(() => {
    if (!userId) {
      router.push("/");
    }
  }, [userId, router]);

  if (!userId) return null;

  const T = {
    title: { en: "Warrior Statistics", ar: "إحصائيات المحارب" },
    overview: { en: "Overview", ar: "نظرة عامة" },
    history: { en: "Game History", ar: "تاريخ الألعاب" },
    powerups: { en: "Power-ups", ar: "القوى" },
    totalGames: { en: "Total Games", ar: "إجمالي الألعاب" },
    winRate: { en: "Win Rate", ar: "نسبة الفوز" },
    totalScore: { en: "Total Score", ar: "إجمالي النقاط" },
    avgScore: { en: "Avg Score", ar: "متوسط النقاط" },
    favoriteMode: { en: "Favorite Mode", ar: "الوضع المفضل" },
    wins: { en: "Wins", ar: "الانتصارات" },
    losses: { en: "Losses", ar: "الهزائم" },
    draws: { en: "Draws", ar: "التعادلات" },
    recentGames: { en: "Recent Games", ar: "الألعاب الأخيرة" },
    mode: { en: "Mode", ar: "الوضع" },
    result: { en: "Result", ar: "النتيجة" },
    score: { en: "Score", ar: "النقاط" },
    rank: { en: "Rank", ar: "المرتبة" },
    date: { en: "Date", ar: "التاريخ" },
    mostUsed: { en: "Most Used", ar: "الأكثر استخداماً" },
    viewAll: { en: "View All", ar: "عرض الكل" },
    back: { en: "Back", ar: "رجوع" },
  };

  const getResultColor = (result: string) => {
    switch (result) {
      case "win": return "#22c55e";
      case "loss": return "#ef4444";
      case "draw": return "#eab308";
      default: return "#6b7280";
    }
  };

  const getResultIcon = (result: string) => {
    switch (result) {
      case "win": return "🏆";
      case "loss": return "💔";
      case "draw": return "🤝";
      default: return "❓";
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white" dir={isAr ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="bg-gradient-to-b from-purple-900/30 to-gray-950 border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-black flex items-center gap-3">
                <span className="text-4xl">📊</span>
                {T.title[language]}
              </h1>
              <p className="text-gray-400 mt-2">
                {username} • {stats.totalGames} {isAr ? "لعبة" : "games played"}
              </p>
            </div>
            <Link
              href="/"
              className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-bold transition-colors"
            >
              {isAr ? "🏠 رجوع" : "🏠 Back"}
            </Link>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-8">
            {(["overview", "history", "powerups"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
                  px-6 py-3 rounded-xl font-bold transition-all
                  ${activeTab === tab
                    ? "bg-purple-500 text-white shadow-lg shadow-purple-500/25"
                    : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
                  }
                `}
              >
                {tab === "overview" && T.overview[language]}
                {tab === "history" && T.history[language]}
                {tab === "powerups" && T.powerups[language]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Main Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { 
                  label: T.totalGames[language], 
                  value: stats.totalGames, 
                  icon: "🎮", 
                  color: "#8b5cf6",
                  subtext: isAr ? "لعبة" : "games"
                },
                { 
                  label: T.winRate[language], 
                  value: `${stats.winRate}%`, 
                  icon: "📈", 
                  color: "#22c55e",
                  subtext: `${stats.wins}W / ${stats.losses}L`
                },
                { 
                  label: T.totalScore[language], 
                  value: stats.totalScore.toLocaleString(), 
                  icon: "💎", 
                  color: "#eab308",
                  subtext: isAr ? "نقطة" : "points"
                },
                { 
                  label: T.avgScore[language], 
                  value: stats.averageScore.toLocaleString(), 
                  icon: "⭐", 
                  color: "#f97316",
                  subtext: isAr ? "لكل لعبة" : "per game"
                },
              ].map((stat, idx) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-gray-900/80 backdrop-blur-md rounded-2xl p-5 border border-gray-800"
                  style={{ boxShadow: `0 0 20px ${stat.color}10` }}
                >
                  <div className="text-3xl mb-2">{stat.icon}</div>
                  <div className="text-gray-400 text-sm">{stat.label}</div>
                  <div className="text-2xl font-black mt-1" style={{ color: stat.color }}>
                    {stat.value}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{stat.subtext}</div>
                </motion.div>
              ))}
            </div>

            {/* Win/Loss/Draw Breakdown */}
            <div className="bg-gray-900/80 backdrop-blur-md rounded-2xl p-6 border border-gray-800">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span>📊</span>
                {isAr ? "تفصيل النتائج" : "Results Breakdown"}
              </h3>
              <div className="flex items-center gap-4">
                <div className="flex-1 space-y-3">
                  {[
                    { label: T.wins[language], value: stats.wins, total: stats.totalGames, color: "#22c55e" },
                    { label: T.losses[language], value: stats.losses, total: stats.totalGames, color: "#ef4444" },
                    { label: T.draws[language], value: stats.draws, total: stats.totalGames, color: "#eab308" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-3">
                      <div className="w-20 text-sm font-bold" style={{ color: item.color }}>
                        {item.label}
                      </div>
                      <div className="flex-1 h-3 bg-gray-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(item.value / item.total) * 100}%` }}
                          transition={{ duration: 1, delay: 0.5 }}
                          className="h-full rounded-full"
                          style={{ background: item.color }}
                        />
                      </div>
                      <div className="w-12 text-right font-bold">{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Favorite Mode & Mode Stats */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Favorite Mode */}
              <div className="bg-gray-900/80 backdrop-blur-md rounded-2xl p-6 border border-gray-800">
                <h3 className="text-lg font-bold mb-4">{T.favoriteMode[language]}</h3>
                <div className="flex items-center gap-4">
                  <div 
                    className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl"
                    style={{ 
                      background: `${MODE_CONFIG[stats.favoriteMode].color}20`,
                      border: `2px solid ${MODE_CONFIG[stats.favoriteMode].color}`,
                    }}
                  >
                    {MODE_CONFIG[stats.favoriteMode].icon}
                  </div>
                  <div>
                    <div 
                      className="text-2xl font-black"
                      style={{ color: MODE_CONFIG[stats.favoriteMode].color }}
                    >
                      {isAr 
                        ? MODE_CONFIG[stats.favoriteMode].label.ar 
                        : MODE_CONFIG[stats.favoriteMode].label.en}
                    </div>
                    <div className="text-gray-400">
                      {stats.gamesByMode[stats.favoriteMode]} {isAr ? "لعبة" : "games played"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Mode Distribution */}
              <div className="bg-gray-900/80 backdrop-blur-md rounded-2xl p-6 border border-gray-800">
                <h3 className="text-lg font-bold mb-4">
                  {isAr ? "التوزيع حسب الوضع" : "Mode Distribution"}
                </h3>
                <div className="space-y-2">
                  {Object.entries(stats.gamesByMode)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 5)
                    .map(([mode, count]) => {
                      const modeKey = mode as GameMode;
                      const wins = stats.winsByMode[modeKey] || 0;
                      return (
                        <div key={mode} className="flex items-center gap-3">
                          <span className="text-lg">{MODE_CONFIG[modeKey].icon}</span>
                          <div className="flex-1">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-300">
                                {isAr ? MODE_CONFIG[modeKey].label.ar : MODE_CONFIG[modeKey].label.en}
                              </span>
                              <span className="text-gray-500">
                                {count} {isAr ? "لعبة" : "games"} • {wins}W
                              </span>
                            </div>
                            <div className="h-2 bg-gray-800 rounded-full mt-1 overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ 
                                  width: `${(count / stats.totalGames) * 100}%`,
                                  background: MODE_CONFIG[modeKey].color,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Recent Games Preview */}
            <div className="bg-gray-900/80 backdrop-blur-md rounded-2xl p-6 border border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">{T.recentGames[language]}</h3>
                <button 
                  onClick={() => setActiveTab("history")}
                  className="text-sm text-purple-400 hover:text-purple-300 font-bold"
                >
                  {T.viewAll[language]} →
                </button>
              </div>
              <div className="space-y-2">
                {stats.recentGames.slice(0, 3).map((game, idx) => (
                  <motion.div
                    key={game.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-center gap-4 p-3 bg-gray-800/50 rounded-xl"
                  >
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
                      style={{ background: MODE_CONFIG[game.mode].color + "20" }}
                    >
                      {MODE_CONFIG[game.mode].icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">
                          {isAr ? MODE_CONFIG[game.mode].label.ar : MODE_CONFIG[game.mode].label.en}
                        </span>
                        <span 
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ 
                            background: getResultColor(game.result) + "20",
                            color: getResultColor(game.result),
                          }}
                        >
                          {getResultIcon(game.result)} {game.result.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {game.date} • {game.score.toLocaleString()} pts
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">#{game.rank}</div>
                      <div className="text-xs text-gray-500">of {game.totalPlayers}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* HISTORY TAB */}
        {activeTab === "history" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {stats.recentGames.map((game, idx) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-gray-900/80 backdrop-blur-md rounded-2xl p-6 border border-gray-800 hover:border-gray-700 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  {/* Mode Icon */}
                  <div 
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                    style={{ 
                      background: MODE_CONFIG[game.mode].color + "20",
                      border: `2px solid ${MODE_CONFIG[game.mode].color}`,
                    }}
                  >
                    {MODE_CONFIG[game.mode].icon}
                  </div>

                  {/* Game Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-bold text-lg">
                        {isAr ? MODE_CONFIG[game.mode].label.ar : MODE_CONFIG[game.mode].label.en}
                      </span>
                      <span 
                        className="px-3 py-1 rounded-full text-xs font-bold"
                        style={{ 
                          background: getResultColor(game.result) + "20",
                          color: getResultColor(game.result),
                        }}
                      >
                        {getResultIcon(game.result)} {game.result.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-400 flex flex-wrap gap-x-4">
                      <span>📅 {game.date}</span>
                      <span>⏱️ {game.duration} min</span>
                      <span>🎯 {game.correctAnswers}/{game.totalQuestions} correct</span>
                    </div>
                  </div>

                  {/* Score & Rank */}
                  <div className="text-right">
                    <div className="text-2xl font-black" style={{ color: MODE_CONFIG[game.mode].color }}>
                      {game.score.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-400">
                      #{game.rank} of {game.totalPlayers}
                    </div>
                  </div>
                </div>

                {/* Power-ups Used */}
                <div className="mt-4 pt-4 border-t border-gray-800 flex items-center gap-2">
                  <span className="text-sm text-gray-500">{isAr ? "القوى المستخدمة:" : "Power-ups used:"}</span>
                  <div className="flex gap-1">
                    {game.powerUpsUsed.map((powerUp) => (
                      <span key={powerUp} className="text-xl" title={powerUp}>
                        {POWER_UP_ICONS[powerUp]}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* POWER-UPS TAB */}
        {activeTab === "powerups" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Most Used Power-ups */}
            <div className="bg-gray-900/80 backdrop-blur-md rounded-2xl p-6 border border-gray-800">
              <h3 className="text-lg font-bold mb-6">{T.mostUsed[language]}</h3>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                {Object.entries(stats.powerUpUsage)
                  .sort(([,a], [,b]) => b - a)
                  .map(([powerUp, count], idx) => (
                    <motion.div
                      key={powerUp}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className="text-center p-4 bg-gray-800/50 rounded-xl"
                    >
                      <div className="text-4xl mb-2">{POWER_UP_ICONS[powerUp as PowerUpType]}</div>
                      <div className="text-2xl font-black text-purple-400">{count}</div>
                      <div className="text-xs text-gray-500">
                        {isAr ? "مرة" : "times"}
                      </div>
                    </motion.div>
                  ))}
              </div>
            </div>

            {/* Power-up Usage Chart */}
            <div className="bg-gray-900/80 backdrop-blur-md rounded-2xl p-6 border border-gray-800">
              <h3 className="text-lg font-bold mb-4">
                {isAr ? "إحصائيات استخدام القوى" : "Power-up Usage Stats"}
              </h3>
              <div className="space-y-3">
                {Object.entries(stats.powerUpUsage)
                  .sort(([,a], [,b]) => b - a)
                  .map(([powerUp, count]) => {
                    const total = Object.values(stats.powerUpUsage).reduce((a, b) => a + b, 0);
                    const percentage = (count / total) * 100;
                    return (
                      <div key={powerUp} className="flex items-center gap-3">
                        <span className="text-2xl w-10 text-center">{POWER_UP_ICONS[powerUp as PowerUpType]}</span>
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-300">{powerUp}</span>
                            <span className="text-gray-500">{count} ({percentage.toFixed(1)}%)</span>
                          </div>
                          <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              transition={{ duration: 1 }}
                              className="h-full rounded-full bg-gradient-to-r from-purple-500 to-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
}

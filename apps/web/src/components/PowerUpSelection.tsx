"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PowerUpType } from "@quiz-battle/shared";
import { useGameStore } from "../store/gameStore";
import { getSocket } from "../lib/socket";

// ═══════════════════════════════════════════════════════════════════════════════
// POWER-UP THEME CONFIGURATION - Visual identities for each power-up
// ═══════════════════════════════════════════════════════════════════════════════

interface PowerUpTheme {
  icon: string;
  nameEn: string;
  nameAr: string;
  descEn: string;
  descAr: string;
  rarity: "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
  element: "defense" | "attack" | "utility" | "chaos";
  colors: {
    primary: string;
    secondary: string;
    glow: string;
    border: string;
  };
  gradient: string;
  animation: string;
  particleIcon: string;
}

const POWERUP_THEMES: Record<PowerUpType, PowerUpTheme> = {
  [PowerUpType.Shield]: {
    icon: "🛡️",
    nameEn: "Aegis Shield",
    nameAr: "درع إيجيس",
    descEn: "Divine protection blocks one wrong answer",
    descAr: "الحماية الإلهية تحجب إجابة خاطئة",
    rarity: "RARE",
    element: "defense",
    colors: { primary: "#3b82f6", secondary: "#60a5fa", glow: "rgba(59,130,246,0.6)", border: "rgba(59,130,246,0.4)" },
    gradient: "linear-gradient(135deg, rgba(59,130,246,0.3) 0%, rgba(37,99,235,0.1) 100%)",
    animation: "shield-pulse",
    particleIcon: "💎",
  },
  [PowerUpType.FiftyFifty]: {
    icon: "🎲",
    nameEn: "Fate's Dice",
    nameAr: "نرد القدر",
    descEn: "Remove 2 wrong answers by chance",
    descAr: "احذف إجابتين خاطئتين بالحظ",
    rarity: "COMMON",
    element: "utility",
    colors: { primary: "#8b5cf6", secondary: "#a78bfa", glow: "rgba(139,92,246,0.6)", border: "rgba(139,92,246,0.4)" },
    gradient: "linear-gradient(135deg, rgba(139,92,246,0.3) 0%, rgba(124,58,237,0.1) 100%)",
    animation: "dice-roll",
    particleIcon: "✨",
  },
  [PowerUpType.Freeze]: {
    icon: "❄️",
    nameEn: "Frost Prison",
    nameAr: "سجن الصقيع",
    descEn: "Freeze opponent's screen for 5 seconds",
    descAr: "جمّد شاشة الخصم لـ ٥ ثوانٍ",
    rarity: "EPIC",
    element: "attack",
    colors: { primary: "#06b6d4", secondary: "#22d3ee", glow: "rgba(6,182,212,0.6)", border: "rgba(6,182,212,0.4)" },
    gradient: "linear-gradient(135deg, rgba(6,182,212,0.3) 0%, rgba(8,145,178,0.1) 100%)",
    animation: "frost-shimmer",
    particleIcon: "❄️",
  },
  [PowerUpType.DoubleDown]: {
    icon: "💰",
    nameEn: "Golden Gambit",
    nameAr: "رهان الذهب",
    descEn: "Double your score on next correct answer",
    descAr: "ضاعف نقاطك في الإجابة الصحيحة القادمة",
    rarity: "RARE",
    element: "utility",
    colors: { primary: "#eab308", secondary: "#facc15", glow: "rgba(234,179,8,0.6)", border: "rgba(234,179,8,0.4)" },
    gradient: "linear-gradient(135deg, rgba(234,179,8,0.3) 0%, rgba(202,138,4,0.1) 100%)",
    animation: "gold-shine",
    particleIcon: "💫",
  },
  [PowerUpType.Steal]: {
    icon: "🦹",
    nameEn: "Shadow Theft",
    nameAr: "سرقة الظل",
    descEn: "Steal opponent's power-up secretly",
    descAr: "اسرق قوة الخصم سراً",
    rarity: "EPIC",
    element: "attack",
    colors: { primary: "#ec4899", secondary: "#f472b6", glow: "rgba(236,72,153,0.6)", border: "rgba(236,72,153,0.4)" },
    gradient: "linear-gradient(135deg, rgba(236,72,153,0.3) 0%, rgba(219,39,119,0.1) 100%)",
    animation: "shadow-fade",
    particleIcon: "🌑",
  },
  [PowerUpType.DoublePick]: {
    icon: "✌️",
    nameEn: "Twin Strike",
    nameAr: "الضربة المزدوجة",
    descEn: "Select two answers simultaneously",
    descAr: "اختر إجابتين في آن واحد",
    rarity: "COMMON",
    element: "utility",
    colors: { primary: "#22c55e", secondary: "#4ade80", glow: "rgba(34,197,94,0.6)", border: "rgba(34,197,94,0.4)" },
    gradient: "linear-gradient(135deg, rgba(34,197,94,0.3) 0%, rgba(21,128,61,0.1) 100%)",
    animation: "twin-pulse",
    particleIcon: "🍃",
  },
  [PowerUpType.Sandstorm]: {
    icon: "🌪️",
    nameEn: "Desert Fury",
    nameAr: "غضب الصحراء",
    descEn: "Blind all opponents with sandstorm",
    descAr: "أعمِ جميع الخصوم بعاصفة رملية",
    rarity: "LEGENDARY",
    element: "chaos",
    colors: { primary: "#d97706", secondary: "#f59e0b", glow: "rgba(217,119,6,0.6)", border: "rgba(217,119,6,0.4)" },
    gradient: "linear-gradient(135deg, rgba(217,119,6,0.3) 0%, rgba(180,83,9,0.1) 100%)",
    animation: "storm-spin",
    particleIcon: "🌪️",
  },
  [PowerUpType.TimeWarp]: {
    icon: "⏰",
    nameEn: "Chrono Shift",
    nameAr: "الإزاحة الزمنية",
    descEn: "Bonus +5 seconds to answer",
    descAr: "+٥ ثوانٍ إضافية للإجابة",
    rarity: "RARE",
    element: "utility",
    colors: { primary: "#f97316", secondary: "#fb923c", glow: "rgba(249,115,22,0.6)", border: "rgba(249,115,22,0.4)" },
    gradient: "linear-gradient(135deg, rgba(249,115,22,0.3) 0%, rgba(234,88,12,0.1) 100%)",
    animation: "time-tick",
    particleIcon: "⏳",
  },
  [PowerUpType.Whole]: {
    icon: "🔮",
    nameEn: "Oracle's Eye",
    nameAr: "عين العرافة",
    descEn: "See the correct answer briefly",
    descAr: "رؤية الإجابة الصحيحة لفترة وجيزة",
    rarity: "LEGENDARY",
    element: "chaos",
    colors: { primary: "#a855f7", secondary: "#c084fc", glow: "rgba(168,85,247,0.6)", border: "rgba(168,85,247,0.4)" },
    gradient: "linear-gradient(135deg, rgba(168,85,247,0.3) 0%, rgba(147,51,234,0.1) 100%)",
    animation: "oracle-glow",
    particleIcon: "🔮",
  },
};

// Rarity configuration
const RARITY_CONFIG = {
  COMMON: { label: { en: "Common", ar: "عادي" }, glow: "shadow-blue-500/20", border: "border-blue-400/30" },
  RARE: { label: { en: "Rare", ar: "نادر" }, glow: "shadow-purple-500/30", border: "border-purple-400/50" },
  EPIC: { label: { en: "Epic", ar: "ملحمي" }, glow: "shadow-pink-500/40", border: "border-pink-400/60" },
  LEGENDARY: { label: { en: "Legendary", ar: "أسطوري" }, glow: "shadow-amber-500/50", border: "border-amber-400/70" },
};

// Element icons
const ELEMENT_ICONS = {
  defense: "🛡️",
  attack: "⚔️",
  utility: "🎯",
  chaos: "🌀",
};

export function PowerUpSelection() {
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
  const [confirmed, setConfirmed] = useState(false);
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
      if (confirmed) return;

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

  const getProgressWidth = () => {
    return `${(powerUpSelection.selectedPowerUps.length / powerUpSelection.maxSelections) * 100}%`;
  };

  if (!powerUpSelection.isSelecting) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-5xl px-4">
        {/* Themed Header */}
        <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center mb-8">
          {/* Floating particles around title */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {["⚔️", "🛡️", "✨", "🔮", "💎"].map((icon, i) => (
              <motion.span
                key={i}
                className="absolute text-2xl"
                initial={{ 
                  x: 100 + i * 200, 
                  y: 50 + Math.random() * 100,
                  opacity: 0 
                }}
                animate={{ 
                  y: [null, -30, 50],
                  opacity: [0, 0.6, 0],
                  rotate: [0, 360]
                }}
                transition={{ 
                  duration: 4 + i, 
                  repeat: Infinity,
                  delay: i * 0.5
                }}
              >
                {icon}
              </motion.span>
            ))}
          </div>
          
          <motion.div
            animate={{ 
              textShadow: [
                "0 0 20px rgba(251,191,36,0.5)",
                "0 0 40px rgba(251,191,36,0.8)",
                "0 0 20px rgba(251,191,36,0.5)",
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <h1 className="text-4xl md:text-6xl font-black mb-3 tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500">
              {isAr ? "🗡️ ساحة القوى ⚡" : "⚔️ Power Forge ⚡"}
            </h1>
          </motion.div>
          
          <p className="text-gray-300 text-lg max-w-xl mx-auto font-medium leading-relaxed">
            {isAr
              ? "اختر قواك بذكاء! الدفاع للحماية، الهجوم للتدمير، الفوضى للجنون."
              : "Choose your powers wisely! Defense for protection, Attack for destruction, Chaos for mayhem."}
          </p>
          
          {/* Element Legend */}
          <div className="flex justify-center gap-4 mt-4">
            {[
              { icon: "🛡️", label: { en: "Defense", ar: "دفاع" }, color: "#3b82f6" },
              { icon: "⚔️", label: { en: "Attack", ar: "هجوم" }, color: "#ef4444" },
              { icon: "🎯", label: { en: "Utility", ar: "مساعدة" }, color: "#22c55e" },
              { icon: "🌀", label: { en: "Chaos", ar: "فوضى" }, color: "#a855f7" },
            ].map((el) => (
              <div key={el.icon} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-800/50 border border-gray-700">
                <span>{el.icon}</span>
                <span className="text-xs text-gray-300">{isAr ? el.label.ar : el.label.en}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Timer & Progress */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-2xl font-bold ${timeLeft <= 5 ? "text-red-500 animate-pulse" : "text-white"}`}>
              {timeLeft}s
            </span>
            <span className="text-gray-400">
              {isAr
                ? `${powerUpSelection.selectedPowerUps.length} / ${powerUpSelection.maxSelections}`
                : `${powerUpSelection.selectedPowerUps.length} / ${powerUpSelection.maxSelections} selected`}
            </span>
          </div>
          <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-amber-500 to-yellow-400"
              initial={{ width: 0 }}
              animate={{ width: getProgressWidth() }}
              transition={{ type: "spring", stiffness: 100 }}
            />
          </div>
        </motion.div>

        {/* PowerUp Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <AnimatePresence>
            {powerUpSelection.availablePowerUps.map((powerUp, index) => {
              const theme = POWERUP_THEMES[powerUp];
              if (!theme) return null;
              const isSelected = powerUpSelection.selectedPowerUps.includes(powerUp);
              const canSelect =
                !confirmed &&
                (isSelected || powerUpSelection.selectedPowerUps.length < powerUpSelection.maxSelections);
              
              const rarityCfg = RARITY_CONFIG[theme.rarity];
              const isLegendary = theme.rarity === "LEGENDARY";

              return (
                <motion.button
                  key={powerUp}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ 
                    scale: isSelected ? 1.05 : 1, 
                    opacity: 1,
                    y: isSelected ? -8 : 0,
                    rotateY: isSelected ? 5 : 0,
                  }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ delay: index * 0.05, type: "spring", stiffness: 200 }}
                  onClick={() => handleSelect(powerUp)}
                  disabled={!canSelect}
                  whileHover={canSelect ? { 
                    scale: 1.08, 
                    y: -10, 
                    rotateY: 5,
                    transition: { duration: 0.2 } 
                  } : {}}
                  whileTap={canSelect ? { scale: 0.95 } : {}}
                  style={{
                    background: isSelected 
                      ? `linear-gradient(135deg, ${theme.colors.primary}40 0%, ${theme.colors.secondary}20 100%)`
                      : theme.gradient,
                    borderColor: isSelected ? theme.colors.primary : canSelect ? theme.colors.border : "rgba(75,85,99,0.3)",
                    boxShadow: isSelected 
                      ? `0 0 40px ${theme.colors.glow}, inset 0 0 20px ${theme.colors.primary}30`
                      : canSelect 
                        ? `0 4px 20px ${theme.colors.glow}`
                        : "none",
                    transformStyle: "preserve-3d",
                  }}
                  className={`
                    relative p-5 rounded-2xl border-2 transition-all duration-300
                    ${!canSelect && "opacity-40 cursor-not-allowed grayscale"}
                    ${isLegendary && canSelect && !isSelected && "animate-pulse"}
                  `}
                >
                  {/* Rarity Badge */}
                  <div 
                    className="absolute -top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                    style={{
                      background: theme.colors.primary,
                      color: "#000",
                      boxShadow: `0 0 10px ${theme.colors.glow}`,
                    }}
                  >
                    {isAr ? rarityCfg.label.ar : rarityCfg.label.en}
                  </div>

                  {/* Element Badge */}
                  <div 
                    className="absolute top-2 right-2 text-sm"
                    title={theme.element}
                  >
                    {ELEMENT_ICONS[theme.element]}
                  </div>

                  {/* Selected Glow Ring */}
                  {isSelected && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 rounded-2xl pointer-events-none"
                      style={{
                        boxShadow: `inset 0 0 30px ${theme.colors.primary}, 0 0 60px ${theme.colors.glow}`,
                      }}
                    />
                  )}

                  {/* Selected Checkmark */}
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 300 }}
                      className="absolute -top-3 -right-3 w-10 h-10 rounded-full flex items-center justify-center shadow-lg"
                      style={{
                        background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})`,
                        boxShadow: `0 0 20px ${theme.colors.glow}`,
                      }}
                    >
                      <svg className="w-6 h-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </motion.div>
                  )}

                  {/* Animated Icon Container */}
                  <div 
                    className="text-5xl mb-3 relative"
                    style={{
                      filter: isSelected ? `drop-shadow(0 0 10px ${theme.colors.glow})` : "none",
                      animation: canSelect && !isSelected ? `${theme.animation} 3s infinite` : "none",
                    }}
                  >
                    {theme.icon}
                    {/* Floating particles for legendary */}
                    {isLegendary && canSelect && (
                      <motion.span
                        className="absolute -top-1 -right-1 text-lg"
                        animate={{ y: [-2, 2, -2], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        ✨
                      </motion.span>
                    )}
                  </div>

                  {/* Power-Up Name */}
                  <h3 
                    className="font-bold text-lg mb-1"
                    style={{ 
                      color: isSelected ? "#fff" : theme.colors.secondary,
                      textShadow: isSelected ? `0 0 10px ${theme.colors.glow}` : "none",
                    }}
                  >
                    {isAr ? theme.nameAr : theme.nameEn}
                  </h3>

                  {/* Description */}
                  <p className="text-xs text-gray-300 leading-relaxed">
                    {isAr ? theme.descAr : theme.descEn}
                  </p>

                  {/* Selection Order Badge */}
                  {isSelected && (
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute bottom-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{
                        background: theme.colors.primary,
                        color: "#000",
                        boxShadow: `0 0 15px ${theme.colors.glow}`,
                      }}
                    >
                      {powerUpSelection.selectedPowerUps.indexOf(powerUp) + 1}
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Selected PowerUps Preview */}
        {powerUpSelection.selectedPowerUps.length > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="mb-6"
          >
            <p className="text-gray-400 text-sm mb-3 text-center">
              {isAr ? "قواك المختارة:" : "Your selected powers:"}
            </p>
            <div className="flex justify-center gap-3">
              {powerUpSelection.selectedPowerUps.map((powerUp, index) => {
                const theme = POWERUP_THEMES[powerUp];
                return (
                  <motion.div
                    key={`${powerUp}-${index}`}
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: index * 0.1, type: "spring" }}
                    className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl relative"
                    style={{
                      background: `linear-gradient(135deg, ${theme.colors.primary}40, ${theme.colors.secondary}20)`,
                      border: `2px solid ${theme.colors.primary}`,
                      boxShadow: `0 0 20px ${theme.colors.glow}`,
                    }}
                  >
                    {theme.icon}
                    {/* Rarity glow */}
                    <div 
                      className="absolute inset-0 rounded-xl opacity-50"
                      style={{
                        background: `radial-gradient(circle at center, ${theme.colors.glow}, transparent)`,
                      }}
                    />
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Other Players Status */}
        {players.length > 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6"
          >
            <p className="text-gray-500 text-sm mb-2 text-center">
              {isAr ? "حالة اللاعبين الآخرين:" : "Other players status:"}
            </p>
            <div className="flex justify-center gap-4">
              {players
                .filter((p) => p.userId !== userId)
                .map((player) => {
                  const playerSelections = otherSelections[player.userId] || [];
                  const hasSelected = playerSelections.length > 0;

                  return (
                    <div key={player.userId} className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                          hasSelected ? "bg-green-500/30 text-green-400" : "bg-gray-700 text-gray-400"
                        }`}
                      >
                        {hasSelected ? "✓" : "..."}
                      </div>
                      <span className="text-xs text-gray-500 mt-1">{player.username}</span>
                    </div>
                  );
                })}
            </div>
          </motion.div>
        )}

        {/* Confirm Button */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center">
          <button
            onClick={handleConfirm}
            disabled={confirmed}
            className={`
              px-12 py-4 rounded-2xl font-black text-xl tracking-wide transition-all duration-300 border-2
              ${
                confirmed
                  ? "bg-slate-800 border-green-500/50 text-green-400 cursor-default"
                  : powerUpSelection.selectedPowerUps.length > 0
                  ? "bg-gradient-to-r from-red-700 via-red-600 to-amber-600 border-amber-400/50 text-white hover:shadow-[0_0_20px_rgba(217,119,6,0.6)] hover:scale-105"
                  : "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed"
              }
            `}
          >
            {confirmed ? (
              <span className="flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {isAr ? "مستعد للمعركة!" : "Ready for Battle!"}
              </span>
            ) : (
              <span>
                {isAr
                  ? `تأكيد الاختيار (${powerUpSelection.selectedPowerUps.length}/${powerUpSelection.maxSelections})`
                  : `Confirm Selection (${powerUpSelection.selectedPowerUps.length}/${powerUpSelection.maxSelections})`}
              </span>
            )}
          </button>

          {confirmed && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-gray-400 mt-4"
            >
              {isAr ? "في انتظار بقية اللاعبين..." : "Waiting for other players..."}
            </motion.p>
          )}
        </motion.div>

        {/* Background Effects */}
        <div className="fixed inset-0 pointer-events-none z-[-1]">
          {/* Gradient orbs */}
          <div className="absolute top-20 left-10 w-96 h-96 bg-amber-500/10 rounded-full blur-[100px] animate-pulse" />
          <div className="absolute bottom-20 right-10 w-80 h-80 bg-purple-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[120px]" />
          
          {/* Animated grid lines */}
          <div 
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `
                linear-gradient(rgba(251,191,36,0.5) 1px, transparent 1px),
                linear-gradient(90deg, rgba(251,191,36,0.5) 1px, transparent 1px)
              `,
              backgroundSize: "50px 50px",
            }}
          />
        </div>
      </div>
      
      {/* CSS Animations */}
      <style jsx global>{`
        @keyframes shield-pulse {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 5px rgba(59,130,246,0.5)); }
          50% { transform: scale(1.1); filter: drop-shadow(0 0 15px rgba(59,130,246,0.8)); }
        }
        @keyframes dice-roll {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(90deg); }
          50% { transform: rotate(180deg); }
          75% { transform: rotate(270deg); }
        }
        @keyframes frost-shimmer {
          0%, 100% { filter: drop-shadow(0 0 5px rgba(6,182,212,0.5)); }
          50% { filter: drop-shadow(0 0 20px rgba(6,182,212,0.9)); }
        }
        @keyframes gold-shine {
          0%, 100% { filter: brightness(1) drop-shadow(0 0 5px rgba(234,179,8,0.5)); }
          50% { filter: brightness(1.3) drop-shadow(0 0 20px rgba(234,179,8,0.9)); }
        }
        @keyframes shadow-fade {
          0%, 100% { opacity: 1; filter: drop-shadow(0 0 5px rgba(236,72,153,0.5)); }
          50% { opacity: 0.7; filter: drop-shadow(0 0 15px rgba(236,72,153,0.8)); }
        }
        @keyframes twin-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes storm-spin {
          0% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(1.1); }
          100% { transform: rotate(360deg) scale(1); }
        }
        @keyframes time-tick {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1) rotate(5deg); }
        }
        @keyframes oracle-glow {
          0%, 100% { filter: drop-shadow(0 0 10px rgba(168,85,247,0.5)); }
          50% { filter: drop-shadow(0 0 30px rgba(168,85,247,0.9)); }
        }
      `}</style>
    </motion.div>
  );
}

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";

// MAP CAPACITY CONFIGURATION
export const MAP_CAPACITY = {
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 6,
  TERRITORIES_COUNT: 10,
  RECOMMENDED_PLAYERS: 3,
};

interface WorldMapProps {
  territories: Record<string, string | null>;
  fortTerritoryId: Record<string, string>;
  playerColors: Record<string, string>;
  onTerritoryClick?: (territoryId: string) => void;
  selectedTarget?: string | null;
  isMyTurn: boolean;
  phase: string;
  onTerritoryCaptured?: (territoryId: string, isEnemy: boolean) => void;
  currentPlayerId: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 24 REAL WORLD REGIONS - Dynamically selected based on player count
// ═══════════════════════════════════════════════════════════════════════════════
export const TERRITORIES = [
  // NORTH AMERICA (4 territories)
  { id: "0", name: "Alaska", nameAr: "ألاسكا", icon: "🏔️", x: 12, y: 20 },
  { id: "1", name: "Canada", nameAr: "كندا", icon: "🍁", x: 22, y: 25 },
  { id: "2", name: "USA West", nameAr: "الغرب الأمريكي", icon: "🦅", x: 18, y: 38 },
  { id: "3", name: "USA East", nameAr: "الشرق الأمريكي", icon: "🗽", x: 28, y: 38 },

  // SOUTH AMERICA (3 territories)
  { id: "4", name: "Mexico", nameAr: "المكسيك", icon: "🌵", x: 22, y: 48 },
  { id: "5", name: "Brazil", nameAr: "البرازيل", icon: "🦜", x: 32, y: 65 },
  { id: "6", name: "Andes", nameAr: "جبال الأنديز", icon: "🦙", x: 28, y: 72 },

  // EUROPE (5 territories)
  { id: "7", name: "Greenland", nameAr: "جرينلاند", icon: "🧊", x: 38, y: 15 },
  { id: "8", name: "Scandinavia", nameAr: "إسكندنافيا", icon: "❄️", x: 48, y: 22 },
  { id: "9", name: "Britain", nameAr: "بريطانيا", icon: "💂", x: 42, y: 32 },
  { id: "10", name: "Western Europe", nameAr: "أوروبا الغربية", icon: "🏰", x: 46, y: 38 },
  { id: "11", name: "Eastern Europe", nameAr: "أوروبا الشرقية", icon: "⛪", x: 52, y: 35 },

  // AFRICA (5 territories)
  { id: "12", name: "North Africa", nameAr: "شمال أفريقيا", icon: "🐪", x: 48, y: 50 },
  { id: "13", name: "West Africa", nameAr: "غرب أفريقيا", icon: "🌍", x: 42, y: 58 },
  { id: "14", name: "Central Africa", nameAr: "وسط أفريقيا", icon: "🦁", x: 52, y: 60 },
  { id: "15", name: "East Africa", nameAr: "شرق أفريقيا", icon: "🦒", x: 58, y: 58 },
  { id: "16", name: "South Africa", nameAr: "جنوب أفريقيا", icon: "💎", x: 52, y: 72 },

  // ASIA (7 territories)
  { id: "17", name: "Siberia", nameAr: "سيبيريا", icon: "🐻", x: 68, y: 18 },
  { id: "18", name: "Central Asia", nameAr: "آسيا الوسطى", icon: "🏛️", x: 60, y: 40 },
  { id: "19", name: "Middle East", nameAr: "الشرق الأوسط", icon: "🕌", x: 55, y: 48 },
  { id: "20", name: "India", nameAr: "الهند", icon: "🛕", x: 65, y: 52 },
  { id: "21", name: "East Asia", nameAr: "شرق آسيا", icon: "🏯", x: 72, y: 42 },
  { id: "22", name: "Southeast Asia", nameAr: "جنوب شرق آسيا", icon: "🎋", x: 75, y: 55 },
  { id: "23", name: "Australia", nameAr: "أستراليا", icon: "🦘", x: 82, y: 75 },
];

// For backward compatibility
export const CONTINENTS = TERRITORIES;

// Victory/Defeat statements
const VICTORY_STATEMENTS = [
  { ar: "👑 الملك دائماً منتصر!", en: "👑 The King Always Wins!" },
  { ar: "🗡️ انتصار ساحق!", en: "🗡️ Crushing Victory!" },
  { ar: "🏆 لا أحد يقف أمامي!", en: "🏆 None Can Stand Against Me!" },
  { ar: "⚔️ المجد للمنتصر!", en: "⚔️ Glory to the Victor!" },
  { ar: "🌍 العالم يخضع لي!", en: "🌍 The World Bows to Me!" },
];

const DEFEAT_STATEMENTS = [
  { ar: "💀 هزيمة مؤقتة...", en: "💀 A Temporary Defeat..." },
  { ar: "🛡️ سأعود أقوى!", en: "🛡️ I Shall Return Stronger!" },
  { ar: "⚔️ الحرب لم تنتهِ بعد!", en: "⚔️ The War is Not Over!" },
  { ar: "🔥 النار لا تموت!", en: "🔥 The Fire Never Dies!" },
  { ar: "🌅 الغد سيأتي!", en: "🌅 Tomorrow Will Come!" },
];

// Sound effects using Web Audio API
class SoundEffects {
  private ctx: AudioContext | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      try {
        this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch { /* Audio not supported */ }
    }
  }

  playCapture() {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.frequency.setValueAtTime(400, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + 0.3);
    } catch { /* ignore */ }
  }

  playVictory() {
    if (!this.ctx) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + i * 0.15);
        gain.gain.setValueAtTime(0.2, this.ctx!.currentTime + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx!.currentTime + i * 0.15 + 0.4);
        osc.start(this.ctx!.currentTime + i * 0.15);
        osc.stop(this.ctx!.currentTime + i * 0.15 + 0.4);
      });
    } catch { /* ignore */ }
  }

  playDefeat() {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.frequency.setValueAtTime(400, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.5);
      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);
      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + 0.5);
    } catch { /* ignore */ }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORLD MAP COMPONENT
// Uses a real world map image with interactive territory marker overlays
// Just like Risk / سيف المعرفة
// ═══════════════════════════════════════════════════════════════════════════════
export function WorldMap({
  territories,
  fortTerritoryId,
  playerColors,
  onTerritoryClick,
  selectedTarget,
  isMyTurn,
  phase,
  onTerritoryCaptured,
  currentPlayerId,
}: WorldMapProps) {
  const soundRef = useRef<SoundEffects | null>(null);
  const prevTerritories = useRef(territories);

  useEffect(() => {
    soundRef.current = new SoundEffects();
  }, []);

  // Detect territory changes and play capture sound
  useEffect(() => {
    if (!prevTerritories.current) {
      prevTerritories.current = territories;
      return;
    }
    Object.entries(territories).forEach(([tid, ownerId]) => {
      const prevOwner = prevTerritories.current[tid];
      if (ownerId && ownerId !== prevOwner) {
        soundRef.current?.playCapture();
        onTerritoryCaptured?.(tid, prevOwner !== null);
      }
    });
    prevTerritories.current = territories;
  }, [territories, onTerritoryCaptured]);

  const isClickable = (tid: string) => {
    if (!isMyTurn) return false;
    if (phase === "draft_selection") return !territories[tid]; // Can pick unclaimed
    if (phase === "select_target") {
      const owner = territories[tid];
      return owner !== undefined && owner !== null && owner !== currentPlayerId;
    }
    return false;
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "1100px",
        position: "relative",
        borderRadius: "16px",
        overflow: "hidden",
        boxShadow: "0 20px 60px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.08)",
        userSelect: "none",
      }}
    >
      {/* Real world map image as background */}
      <img
        src="/world-map.png"
        alt="World Map"
        draggable={false}
        style={{
          width: "100%",
          height: "auto",
          display: "block",
          filter: "brightness(0.85) contrast(1.1)",
        }}
      />

      {/* Territory markers overlay */}
      {TERRITORIES.filter(t => territories[t.id] !== undefined).map((marker) => {
        const ownerId = territories[marker.id];
        const ownerColor = ownerId ? playerColors[ownerId] : null;
        const isFort = ownerId && fortTerritoryId[ownerId] === marker.id;
        const isSelected = selectedTarget === marker.id;
        const clickable = isClickable(marker.id);
        const isMyTerritory = ownerId === currentPlayerId;

        return (
          <motion.div
            key={marker.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: parseInt(marker.id) * 0.06, type: "spring", stiffness: 200, damping: 15 }}
            onClick={() => clickable && onTerritoryClick?.(marker.id)}
            style={{
              position: "absolute",
              left: `${marker.x}%`,
              top: `${marker.y}%`,
              transform: "translate(-50%, -50%)",
              cursor: clickable ? "pointer" : "default",
              zIndex: isSelected ? 30 : 10,
            }}
          >
            {/* Pulse ring for clickable territories */}
            {clickable && (
              <div
                style={{
                  position: "absolute",
                  inset: -8,
                  borderRadius: "50%",
                  border: "2px solid rgba(255, 215, 0, 0.4)",
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              />
            )}

            {/* Selection glow ring */}
            {isSelected && (
              <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [0.8, 0.3, 0.8] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                style={{
                  position: "absolute",
                  inset: -10,
                  borderRadius: "50%",
                  border: "3px solid #FFD700",
                  boxShadow: "0 0 20px rgba(255, 215, 0, 0.5)",
                }}
              />
            )}

            {/* Main territory badge */}
            <motion.div
              whileHover={clickable ? { scale: 1.15, y: -3 } : {}}
              whileTap={clickable ? { scale: 0.95 } : {}}
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: ownerColor
                  ? `radial-gradient(circle at 30% 30%, ${ownerColor}ee, ${ownerColor}88)`
                  : "radial-gradient(circle at 30% 30%, #5a6a5a, #3a4a3a)",
                border: isSelected
                  ? "3px solid #FFD700"
                  : isFort
                    ? "3px solid #FFD700"
                    : isMyTerritory
                      ? `2px solid ${ownerColor}cc`
                      : "2px solid rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "22px",
                boxShadow: isSelected
                  ? "0 0 25px rgba(255, 215, 0, 0.6), 0 4px 12px rgba(0,0,0,0.4)"
                  : ownerColor
                    ? `0 0 15px ${ownerColor}40, 0 4px 12px rgba(0,0,0,0.3)`
                    : "0 4px 12px rgba(0,0,0,0.3)",
                transition: "all 0.2s ease",
                position: "relative",
              }}
            >
              {marker.icon}

              {/* Fort shield indicator */}
              {isFort && (
                <div
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -6,
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #FFD700, #B8860B)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "11px",
                    border: "1.5px solid #8B6914",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                  }}
                >
                  🏰
                </div>
              )}
            </motion.div>

            {/* Territory name label */}
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: "50%",
                transform: "translateX(-50%)",
                marginTop: 4,
                whiteSpace: "nowrap",
                textAlign: "center",
                pointerEvents: "none",
              }}
            >
              <div
                style={{
                  background: ownerColor ? `${ownerColor}dd` : "rgba(0,0,0,0.75)",
                  borderRadius: 6,
                  padding: "3px 8px",
                  border: isFort
                    ? "1.5px solid #FFD700"
                    : `1px solid ${ownerColor ? `${ownerColor}66` : "rgba(255,255,255,0.12)"}`,
                  backdropFilter: "blur(4px)",
                }}
              >
                <div
                  style={{
                    color: "#fff",
                    fontSize: "10px",
                    fontWeight: 700,
                    lineHeight: 1.3,
                    textShadow: "0 1px 3px rgba(0,0,0,0.6)",
                  }}
                >
                  {marker.nameAr}
                </div>
                <div
                  style={{
                    color: "rgba(255,255,255,0.7)",
                    fontSize: "8px",
                    lineHeight: 1.2,
                  }}
                >
                  {marker.name}
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}

      {/* CSS animation for pulse */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.4); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export { SoundEffects, VICTORY_STATEMENTS, DEFEAT_STATEMENTS };

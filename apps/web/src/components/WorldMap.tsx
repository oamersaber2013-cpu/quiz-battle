"use client";

import { CONQUEST_TERRITORIES } from "@quiz-battle/shared";
import { playCue } from "@/lib/sounds";
import { useGameStore } from "@/store/gameStore";
import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import styles from "./WorldMap.module.css";

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
  language?: "en" | "ar";
  availableTerritories?: string[];
  troops?: Record<string, number>;
}

const MAP_IMAGE_SIZE = 1024;
// Separate nearby controls while retaining the canonical geographic anchor.
const MAP_MARKER_OFFSETS: Readonly<Record<number, readonly [number, number]>> = {
  3: [-20, -10], 4: [15, 10], 6: [-58, 20], 7: [-64, -16],
  8: [-18, 22], 9: [35, -20], 11: [-12, -12], 12: [12, 12],
};

// Country identity remains shared with server ownership and scoring.
export const TERRITORIES = CONQUEST_TERRITORIES.map((territory) => {
  const anchorX = Math.round(territory.worldMap.x / 100 * MAP_IMAGE_SIZE);
  const anchorY = Math.round(territory.worldMap.y / 100 * MAP_IMAGE_SIZE);
  const [offsetX, offsetY] = MAP_MARKER_OFFSETS[territory.id] ?? [0, 0];
  return {
    id: String(territory.id), name: territory.name, nameAr: territory.nameAr,
    icon: territory.worldMap.icon,
    x: anchorX / MAP_IMAGE_SIZE * 100, y: anchorY / MAP_IMAGE_SIZE * 100,
    anchorX, anchorY, buttonX: anchorX + offsetX, buttonY: anchorY + offsetY,
  };
});

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
  language = "ar",
  availableTerritories,
  troops,
}: WorldMapProps) {
  const prevTerritories = useRef(territories);


  // Detect territory changes and play capture sound
  useEffect(() => {
    if (!prevTerritories.current) {
      prevTerritories.current = territories;
      return;
    }
    Object.entries(territories).forEach(([tid, ownerId]) => {
      const prevOwner = prevTerritories.current[tid];
      if (ownerId && ownerId !== prevOwner) {
        if (useGameStore.getState().soundEnabled) playCue("conquest");
        onTerritoryCaptured?.(tid, prevOwner !== null);
      }
    });
    prevTerritories.current = territories;
  }, [territories, onTerritoryCaptured]);

  const isClickable = (tid: string) => {
    if (!isMyTurn) return false;
    if (availableTerritories && !availableTerritories.includes(tid)) return false;
    if (phase === "invasion_selection") return availableTerritories?.includes(tid) ?? false;
    if (phase === "draft_selection") return !territories[tid]; // Can pick unclaimed
    if (phase === "select_target") {
      const owner = territories[tid];
      return owner !== undefined && owner !== null && owner !== currentPlayerId;
    }
    return false;
  };

  return (
    <div
      className={styles.map}
      style={{
        width: "100%",
        maxWidth: "820px",
        margin: "0 auto",
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
        alt={language === "ar" ? "خريطة العالم" : "World map"}
        draggable={false}
        style={{
          width: "100%",
          height: "auto",
          display: "block",
          filter: "brightness(0.85) contrast(1.1)",
        }}
      />

      <svg className={styles.anchors} viewBox={`0 0 ${MAP_IMAGE_SIZE} ${MAP_IMAGE_SIZE}`} aria-hidden="true">
        {TERRITORIES.filter(marker => territories[marker.id] !== undefined).map(marker => (
          <g key={marker.id}>
            <line data-territory-leader={marker.id} x1={marker.anchorX} y1={marker.anchorY}
              x2={marker.buttonX} y2={marker.buttonY} />
            <circle data-territory-anchor={marker.id} cx={marker.anchorX} cy={marker.anchorY} r={4} />
          </g>
        ))}
      </svg>

      {/* Territory markers overlay */}
      {TERRITORIES.filter(t => territories[t.id] !== undefined).map((marker) => {
        const ownerId = territories[marker.id];
        const ownerColor = ownerId ? playerColors[ownerId] : null;
        const isFort = ownerId && fortTerritoryId[ownerId] === marker.id;
        const isSelected = selectedTarget === marker.id;
        const clickable = isClickable(marker.id);
        const isMyTerritory = ownerId === currentPlayerId;

        return (
          <button
            key={marker.id}
            type="button"
            className={styles.marker}
            data-map-territory={marker.id}
            disabled={!clickable}
            aria-label={`${language === "ar" ? marker.nameAr : marker.name}${isFort ? (language === "ar" ? " · حصن" : " · fort") : ""}`}
            aria-description={troops ? `${troops[marker.id] ?? 0} ${language === "ar" ? "جندي" : "troops"}` : undefined}
            aria-pressed={isSelected}
            onClick={() => clickable && onTerritoryClick?.(marker.id)}
            style={{
              position: "absolute",
              left: `${marker.buttonX / MAP_IMAGE_SIZE * 100}%`,
              top: `${marker.buttonY / MAP_IMAGE_SIZE * 100}%`,
              transform: "translate(-50%, -50%)",
              cursor: clickable ? "pointer" : "default",
              padding: 0,
              border: 0,
              background: "transparent",
              color: "#fff",
              zIndex: isSelected ? 30 : 10,
            }}
          >
            {/* Pulse ring for clickable territories */}
            {clickable && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
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
                  inset: -3,
                  borderRadius: "50%",
                  border: "3px solid #FFD700",
                  boxShadow: "0 0 20px rgba(255, 215, 0, 0.5)",
                }}
              />
            )}

            {/* Main territory badge */}
            <motion.div
              className={styles.badge}
              whileHover={clickable ? { scale: 1.15, y: -3 } : {}}
              whileTap={clickable ? { scale: 0.95 } : {}}
              style={{
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
                boxShadow: isSelected
                  ? "0 0 25px rgba(255, 215, 0, 0.6), 0 4px 12px rgba(0,0,0,0.4)"
                  : ownerColor
                    ? `0 0 15px ${ownerColor}40, 0 4px 12px rgba(0,0,0,0.3)`
                    : "0 4px 12px rgba(0,0,0,0.3)",
                transition: "all 0.2s ease",
                position: "relative",
              }}
            >
              {troops ? <strong>{troops[marker.id] ?? 0}</strong> : marker.icon}

              {/* Fort shield indicator */}
              {isFort && (
                <div
                  className={styles.fort}
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -6,
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
              className={styles.label}
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
                  {language === "ar" ? marker.nameAr : marker.name}
                </div>
              </div>
            </div>
          </button>
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

export { VICTORY_STATEMENTS, DEFEAT_STATEMENTS };

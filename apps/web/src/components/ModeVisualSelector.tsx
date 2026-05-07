"use client";

import { useState } from "react";
import { GameMode } from "@quiz-battle/shared";
import ModeCharacters from "./ModeCharacterArt";

interface ModeVisualSelectorProps {
  selectedMode: GameMode;
  onSelect: (mode: GameMode) => void;
  language: "en" | "ar";
}

// SVG Character mapping
const MODE_SVG_CHARS: Record<GameMode, string> = {
  [GameMode.Classic]: ModeCharacters.classic,
  [GameMode.Survival]: ModeCharacters.survival,
  [GameMode.Conquest]: ModeCharacters.conquest,
  [GameMode.Chaos]: ModeCharacters.chaos,
  [GameMode.Custom]: ModeCharacters.conquest, // Fallback
};

// Mode visual configurations with background scenes
const MODE_VISUALS: Record<GameMode, {
  name: { en: string; ar: string };
  tagline: { en: string; ar: string };
  icon: string;
  character: string;
  colors: {
    primary: string;
    secondary: string;
    glow: string;
  };
  background: string;
  particles: string[];
  stateColors?: Record<string, { primary: string; secondary: string; glow: string }>;
}> = {
  [GameMode.Classic]: {
    name: { en: "Classic", ar: "كلاسيك" },
    tagline: { en: "Forge Your Legend", ar: "اصنع أسطورتك" },
    icon: "⚔️",
    character: "🛡️",
    colors: { primary: "#6c63ff", secondary: "#a855f7", glow: "rgba(108, 99, 255, 0.5)" },
    background: "linear-gradient(180deg, #1a1533 0%, #0d0b1a 50%, #161330 100%)",
    particles: ["📎", "🔮", "✨"]
  },
  [GameMode.Survival]: {
    name: { en: "Survival", ar: "البقاء" },
    tagline: { en: "Survive The Reaper", ar: "نجا من الحاصد" },
    icon: "💀",
    character: "💀",
    colors: { primary: "#ff4757", secondary: "#ff6348", glow: "rgba(255, 71, 87, 0.5)" },
    background: "linear-gradient(180deg, #2d1818 0%, #1a0f0f 50%, #0f0a0a 100%)",
    particles: ["🔥", "🦴", "🦇"]
  },
  [GameMode.Conquest]: {
    name: { en: "Conquest", ar: "غزو" },
    tagline: { en: "Outsmart The Commander", ar: "تفوق على القائد" },
    icon: "🌍",
    character: "🌍",
    colors: { primary: "#2ed573", secondary: "#1e90ff", glow: "rgba(46, 213, 115, 0.5)" },
    background: "linear-gradient(180deg, #0f241a 0%, #0a1a12 50%, #05100a 100%)",
    particles: ["🗺️", "🏰", "👑"]
  },
  [GameMode.Chaos]: {
    name: { en: "Chaos", ar: "فوضى" },
    tagline: { en: "Embrace The Madness", ar: "احتضن الجنون" },
    icon: "😈",
    character: "😈",
    colors: { primary: "#ff00ff", secondary: "#00ffff", glow: "rgba(255, 0, 255, 0.6)" },
    background: "linear-gradient(135deg, #2d1f3d 0%, #1f1f3d 25%, #1f3d3d 50%, #3d1f1f 75%, #2d1f3d 100%)",
    particles: ["🎲", "⚡", "🔥", "💀", "🌀"],
    stateColors: {
      CALM: { primary: "#00e676", secondary: "#00d4ff", glow: "rgba(0, 230, 118, 0.5)" },
      UNSTABLE: { primary: "#ffd700", secondary: "#ff8c00", glow: "rgba(255, 215, 0, 0.6)" },
      CHAOTIC: { primary: "#ff6b6b", secondary: "#4ecdc4", glow: "rgba(255, 107, 107, 0.6)" },
      INSANITY: { primary: "#ff4757", secondary: "#ff0000", glow: "rgba(255, 71, 87, 0.7)" },
      ANARCHY: { primary: "#ff00ff", secondary: "#00ffff", glow: "rgba(255, 0, 255, 0.8)" }
    }
  },
  [GameMode.Custom]: {
    name: { en: "Custom", ar: "مخصص" },
    tagline: { en: "Create Your Rules", ar: "اصنع قواعدك" },
    icon: "⚙️",
    character: "⚙️",
    colors: { primary: "#8b5cf6", secondary: "#a78bfa", glow: "rgba(139, 92, 246, 0.5)" },
    background: "linear-gradient(135deg, #1a1520 0%, #0f0d14 100%)",
    particles: ["⚙️", "🔧", "📋"]
  },
};

export function ModeVisualSelector({ selectedMode, onSelect, language }: ModeVisualSelectorProps) {
  const [hoveredMode, setHoveredMode] = useState<GameMode | null>(null);
  const isRTL = language === "ar";

  return (
    <div className="mode-visual-selector">
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(3deg); }
        }
        @keyframes drift {
          0% { transform: translateX(-20px); }
          100% { transform: translateX(20px); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes glitch {
          0%, 100% { transform: translate(0); }
          25% { transform: translate(-2px, 2px); }
          50% { transform: translate(2px, -2px); }
          75% { transform: translate(-2px, -2px); }
        }
        @keyframes screen-shake {
          0%, 100% { transform: translate(0, 0); }
          10% { transform: translate(-3px, -3px) rotate(-1deg); }
          20% { transform: translate(3px, 3px) rotate(1deg); }
          30% { transform: translate(-3px, 3px) rotate(-1deg); }
          40% { transform: translate(3px, -3px) rotate(1deg); }
          50% { transform: translate(-2px, 2px) rotate(-0.5deg); }
          60% { transform: translate(2px, -2px) rotate(0.5deg); }
          70% { transform: translate(-1px, 1px); }
          80% { transform: translate(1px, -1px); }
          90% { transform: translate(-0.5px, 0.5px); }
        }
        @keyframes glitch-clip {
          0% { clip-path: inset(20% 0 60% 0); transform: translate(-2px, 2px); }
          20% { clip-path: inset(60% 0 20% 0); transform: translate(2px, -2px); }
          40% { clip-path: inset(40% 0 40% 0); transform: translate(-2px, -2px); }
          60% { clip-path: inset(80% 0 10% 0); transform: translate(2px, 2px); }
          80% { clip-path: inset(10% 0 70% 0); transform: translate(-2px, 2px); }
          100% { clip-path: inset(30% 0 50% 0); transform: translate(0, 0); }
        }
        @keyframes color-shift {
          0% { filter: hue-rotate(0deg); }
          25% { filter: hue-rotate(90deg); }
          50% { filter: hue-rotate(180deg); }
          75% { filter: hue-rotate(270deg); }
          100% { filter: hue-rotate(360deg); }
        }
        @keyframes anarchy-flash {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        .mode-scene-card {
          position: relative;
          border-radius: 24px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          border: 2px solid rgba(255,255,255,0.1);
        }
        .mode-scene-card:hover {
          transform: scale(1.02);
          border-color: rgba(255,255,255,0.3);
        }
        .mode-scene-card.selected {
          transform: scale(1.05);
          border-color: currentColor;
          box-shadow: 0 20px 60px currentColor;
          z-index: 10;
        }
        .floating-particle {
          position: absolute;
          font-size: 1.5rem;
          animation: float 4s ease-in-out infinite;
          pointer-events: none;
        }
        .character-avatar {
          position: absolute;
          font-size: 6rem;
          filter: drop-shadow(0 0 30px currentColor);
          z-index: 5;
          transition: all 0.3s ease;
        }
        .mode-scene-card:hover .character-avatar {
          transform: scale(1.1);
          filter: drop-shadow(0 0 50px currentColor);
        }
        .mode-info {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 20px;
          background: linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.8) 100%);
          z-index: 10;
        }
        .mode-tagline {
          font-size: 0.85rem;
          opacity: 0.8;
          font-weight: 600;
        }
        /* Chaos State Visual Effects */
        .chaos-calm {
          animation: pulse-glow 3s ease-in-out infinite;
        }
        .chaos-unstable {
          animation: pulse-glow 2s ease-in-out infinite, color-shift 8s linear infinite;
          border-color: #ffd700 !important;
        }
        .chaos-chaotic {
          animation: pulse-glow 1.5s ease-in-out infinite, color-shift 4s linear infinite;
          border-color: #ff6b6b !important;
        }
        .chaos-insanity {
          animation: screen-shake 0.5s ease-in-out infinite, pulse-glow 1s ease-in-out infinite;
          border-color: #ff4757 !important;
          box-shadow: 0 0 30px rgba(255, 71, 87, 0.5) !important;
        }
        .chaos-anarchy {
          animation: screen-shake 0.3s ease-in-out infinite, anarchy-flash 0.5s ease-in-out infinite, glitch-clip 0.5s ease-in-out infinite;
          border-color: #ff00ff !important;
          box-shadow: 0 0 50px rgba(255, 0, 255, 0.8) !important;
        }
        .chaos-meter {
          position: absolute;
          bottom: 80px;
          left: 20px;
          right: 20px;
          height: 6px;
          background: rgba(255,255,255,0.1);
          border-radius: 3px;
          overflow: hidden;
          z-index: 15;
        }
        .chaos-meter-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.5s ease, background 0.3s ease;
        }
        .chaos-state-label {
          position: absolute;
          bottom: 95px;
          left: 20px;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          z-index: 15;
          padding: 2px 8px;
          border-radius: 4px;
          background: rgba(0,0,0,0.5);
        }
      `}</style>

      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", 
        gap: 20 
      }}>
        {Object.entries(MODE_VISUALS).map(([mode, visual]) => {
          const modeValue = mode as GameMode;
          const isSelected = selectedMode === modeValue;
          const isHovered = hoveredMode === modeValue;

          return (
            <div
              key={mode}
              className={`mode-scene-card ${isSelected ? "selected" : ""}`}
              onClick={() => onSelect(modeValue)}
              onMouseEnter={() => setHoveredMode(modeValue)}
              onMouseLeave={() => setHoveredMode(null)}
              style={{
                height: 280,
                background: visual.background,
                color: visual.colors.primary,
                borderColor: isSelected ? visual.colors.primary : undefined,
                boxShadow: isSelected ? `0 20px 60px ${visual.colors.glow}` : undefined
              }}
            >
              {/* Animated Background Effects */}
              <div style={{
                position: "absolute",
                inset: 0,
                opacity: 0.3,
                background: `radial-gradient(circle at 50% 50%, ${visual.colors.glow} 0%, transparent 70%)`,
                animation: "pulse-glow 3s ease-in-out infinite"
              }} />

              {/* Floating Particles */}
              {visual.particles.map((particle, i) => (
                <div
                  key={i}
                  className="floating-particle"
                  style={{
                    left: `${20 + i * 30}%`,
                    top: `${20 + (i % 2) * 40}%`,
                    animationDelay: `${i * 0.5}s`,
                    opacity: isSelected || isHovered ? 0.8 : 0.4
                  }}
                >
                  {particle}
                </div>
              ))}

              {/* Character Avatar - SVG Art */}
              <div 
                className="character-avatar"
                style={{
                  top: "25%",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 120,
                  height: 120,
                  color: visual.colors.primary,
                  animation: modeValue === GameMode.Chaos ? "glitch 1s infinite, pulse-glow 2s infinite" :
                            "float 4s ease-in-out infinite"
                }}
                dangerouslySetInnerHTML={{ __html: MODE_SVG_CHARS[modeValue] }}
              />

              {/* Mode Icon Badge */}
              <div style={{
                position: "absolute",
                top: 16,
                right: 16,
                width: 44,
                height: 44,
                borderRadius: 12,
                background: visual.colors.primary,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.5rem",
                boxShadow: `0 4px 20px ${visual.colors.glow}`,
                zIndex: 10
              }}>
                {visual.icon}
              </div>

              {/* Mode Info */}
              <div className="mode-info" style={{ textAlign: isRTL ? "right" : "left" }}>
                <div style={{ 
                  fontSize: "1.4rem", 
                  fontWeight: 800, 
                  color: "#fff",
                  marginBottom: 4
                }}>
                  {visual.name[language]}
                </div>
                <div className="mode-tagline" style={{ color: visual.colors.secondary }}>
                  {visual.tagline[language]}
                </div>
              </div>

              {/* Selection Indicator */}
              {isSelected && (
                <div style={{
                  position: "absolute",
                  top: 16,
                  left: 16,
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "#00e676",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1rem",
                  zIndex: 10,
                  animation: "bounce 0.5s ease"
                }}>
                  ✓
                </div>
              )}

              {/* Hover Glow Ring */}
              {(isSelected || isHovered) && (
                <div style={{
                  position: "absolute",
                  inset: -2,
                  borderRadius: 26,
                  border: `3px solid ${visual.colors.primary}`,
                  opacity: 0.5,
                  pointerEvents: "none"
                }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

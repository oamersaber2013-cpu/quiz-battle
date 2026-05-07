"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GameMode, WarriorCharacter, getWarriorsForMode, getRandomWarriorForMode } from "@quiz-battle/shared";

interface WarriorSelectorProps {
  mode: GameMode;
  language: "en" | "ar";
  onSelect: (warrior: WarriorCharacter) => void;
  selectedWarriorId?: string;
}

// Mode-themed backgrounds
const MODE_BACKGROUNDS: Record<GameMode, { gradient: string; particles: string[]; accent: string }> = {
  [GameMode.Classic]: { 
    gradient: "linear-gradient(135deg, #2d1f3d 0%, #1f1f3d 100%)", 
    particles: ["⚔️", "🛡️", "✨"],
    accent: "#6c63ff"
  },
  [GameMode.Survival]: { 
    gradient: "linear-gradient(135deg, #3d1f1f 0%, #1f1f1f 100%)", 
    particles: ["💀", "🔥", "⚠️"],
    accent: "#ff4757"
  },
  [GameMode.Conquest]: { 
    gradient: "linear-gradient(135deg, #1f3d1f 0%, #1f3d3d 100%)", 
    particles: ["🌍", "👑", "⚔️"],
    accent: "#2ed573"
  },
  [GameMode.Chaos]: { 
    gradient: "linear-gradient(135deg, #3d1f3d 0%, #1f1f3d 25%, #1f3d3d 50%, #3d1f1f 75%, #2d1f3d 100%)", 
    particles: ["😈", "🎲", "⚡", "🔥", "💀"],
    accent: "#ff00ff"
  },
  [GameMode.Custom]: { 
    gradient: "linear-gradient(135deg, #2d2d2d 0%, #1f1f1f 100%)", 
    particles: ["⚙️", "🔧", "✨"],
    accent: "#8b5cf6"
  },
};

export function WarriorSelector({ mode, language, onSelect, selectedWarriorId }: WarriorSelectorProps) {
  const warriors = getWarriorsForMode(mode);
  const [hoveredWarrior, setHoveredWarrior] = useState<string | null>(null);
  const [floatingParticles, setFloatingParticles] = useState<{id: number; icon: string; x: number; y: number}[]>([]);
  
  const isRTL = language === "ar";
  const theme = MODE_BACKGROUNDS[mode] || MODE_BACKGROUNDS[GameMode.Classic];

  // Generate floating particles
  useEffect(() => {
    const particles = theme.particles.map((icon, i) => ({
      id: i,
      icon,
      x: Math.random() * 100,
      y: Math.random() * 100,
    }));
    setFloatingParticles(particles);
  }, [mode, theme.particles]);

  return (
    <div className="warrior-selector" style={{ position: "relative" }}>
      {/* Floating Background Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
        {floatingParticles.map((p) => (
          <motion.span
            key={p.id}
            className="absolute text-2xl opacity-20"
            initial={{ x: `${p.x}%`, y: `${p.y}%`, opacity: 0 }}
            animate={{ 
              y: [`${p.y}%`, `${p.y - 20}%`, `${p.y}%`],
              opacity: [0.1, 0.3, 0.1],
              rotate: [0, 360]
            }}
            transition={{ 
              duration: 5 + Math.random() * 5, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            {p.icon}
          </motion.span>
        ))}
      </div>

      {/* Header */}
      <motion.h3 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-black mb-6 text-center"
        style={{ 
          textShadow: `0 0 20px ${theme.accent}60`,
          color: "#fff",
        }}
      >
        {isRTL ? "⚔️ اختر بطلك ⚔️" : "⚔️ Choose Your Champion ⚔️"}
      </motion.h3>
      
      <div className="warrior-grid" style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", 
        gap: 16 
      }}>
        {warriors.map((warrior) => {
          const isSelected = selectedWarriorId === warrior.id;
          const isHovered = hoveredWarrior === warrior.id;
          
          return (
            <div
              key={warrior.id}
              className={`warrior-card ${isSelected ? "selected" : ""}`}
              onClick={() => onSelect(warrior)}
              onMouseEnter={() => setHoveredWarrior(warrior.id)}
              onMouseLeave={() => setHoveredWarrior(null)}
              style={{
                padding: 20,
                borderRadius: 16,
                border: `2px solid ${isSelected ? warrior.color : "rgba(255,255,255,0.1)"}`,
                background: isSelected 
                  ? `linear-gradient(135deg, ${warrior.color}33 0%, ${warrior.color}11 100%)`
                  : "var(--grad-card)",
                boxShadow: isSelected 
                  ? `0 8px 32px ${warrior.glowColor}` 
                  : isHovered 
                    ? `0 4px 16px ${warrior.glowColor}40`
                    : "none",
                cursor: "pointer",
                transition: "all 0.3s ease",
                position: "relative",
                overflow: "hidden"
              }}
            >
              {/* Animated glow background */}
              <div style={{
                position: "absolute",
                inset: 0,
                background: `radial-gradient(circle at 50% 50%, ${warrior.glowColor}20 0%, transparent 70%)`,
                opacity: isSelected ? 1 : 0,
                transition: "opacity 0.3s ease",
                animation: isSelected ? "pulse 2s ease-in-out infinite" : "none"
              }} />
              
              {/* Warrior Avatar */}
              <div style={{
                width: 80,
                height: 80,
                margin: "0 auto 16px",
                borderRadius: "50%",
                background: warrior.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "2.5rem",
                boxShadow: `0 4px 20px ${warrior.glowColor}`,
                position: "relative",
                zIndex: 1
              }}>
                {warrior.emoji}
              </div>
              
              {/* Warrior Name */}
              <div style={{
                fontWeight: 800,
                fontSize: "1.1rem",
                textAlign: "center",
                marginBottom: 8,
                color: isSelected ? "#fff" : "var(--clr-text)",
                position: "relative",
                zIndex: 1
              }}>
                {warrior.name[language]}
              </div>
              
              {/* Description */}
              <div style={{
                fontSize: "0.8rem",
                textAlign: "center",
                color: isSelected ? "rgba(255,255,255,0.8)" : "var(--clr-text-2)",
                marginBottom: 12,
                minHeight: 40,
                position: "relative",
                zIndex: 1
              }}>
                {warrior.description[language]}
              </div>
              
              {/* Abilities */}
              <div style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                justifyContent: "center",
                marginBottom: 12,
                position: "relative",
                zIndex: 1
              }}>
                {warrior.abilities.slice(0, 2).map((ability, idx) => (
                  <span
                    key={idx}
                    style={{
                      fontSize: "0.7rem",
                      padding: "4px 10px",
                      borderRadius: 12,
                      background: isSelected ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.05)",
                      color: isSelected ? "#fff" : "var(--clr-text-2)",
                      fontWeight: 600
                    }}
                  >
                    {ability}
                  </span>
                ))}
              </div>
              
              {/* Special Power */}
              <div style={{
                fontSize: "0.75rem",
                textAlign: "center",
                padding: 8,
                borderRadius: 8,
                background: isSelected ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.03)",
                color: isSelected ? warrior.color : "var(--clr-text-3)",
                fontWeight: 700,
                position: "relative",
                zIndex: 1
              }}>
                {warrior.specialPower}
              </div>
              
              {/* Selection indicator */}
              {isSelected && (
                <div style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: warrior.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.8rem",
                  zIndex: 2
                }}>
                  ✓
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Random Selection Button */}
      <button
        onClick={() => onSelect(getRandomWarriorForMode(mode))}
        style={{
          marginTop: 20,
          padding: "12px 24px",
          borderRadius: 20,
          border: "1px solid rgba(255,255,255,0.2)",
          background: "var(--grad-card)",
          color: "var(--clr-text)",
          fontWeight: 600,
          cursor: "pointer",
          transition: "all 0.3s ease",
          width: "100%"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "var(--grad-card)";
        }}
      >
        {isRTL ? "🎲 محارب عشوائي" : "🎲 Random Warrior"}
      </button>
    </div>
  );
}

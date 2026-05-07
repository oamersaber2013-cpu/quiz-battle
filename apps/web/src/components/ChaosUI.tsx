// ═══════════════════════════════════════════════════════════════════════════════
// CHAOS UI COMPONENTS - Drama, Voting, Modifiers, Traps
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

type DramaType = "TAB_LEFT" | "INACTIVITY" | "SWITCHED_APP" | "SUSPICIOUS_BEHAVIOR";
type VoteOption = "FORGIVE" | "REDUCE_SCORE" | "BLOCK_QUESTION";
type ChaosModifier = 
  | "REVERSE_VOTING" 
  | "SHUFFLE_OPTIONS" 
  | "INVERT_SCORES" 
  | "MODIFY_TIMER" 
  | "TRAP_REVERSAL"
  | "MINOR_CHAOS"
  | "DOUBLE_POINTS"
  | "HIDE_ANSWERS";

interface DramaEvent {
  id: string;
  type: DramaType;
  playerId: string;
  username: string;
  chaosLevel: number;
}

interface VotingSession {
  dramaEventId: string;
  targetPlayerId: string;
  targetUsername: string;
  duration: number;
  options: VoteOption[];
  totalVotes: number;
  timeRemaining: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DRAMA EVENT POPUP
// ═══════════════════════════════════════════════════════════════════════════════

interface DramaPopupProps {
  drama: DramaEvent;
  onStartVoting: () => void;
  language: "en" | "ar";
}

export function DramaPopup({ drama, onStartVoting, language }: DramaPopupProps) {
  const isRTL = language === "ar";
  
  const dramaMessages: Record<DramaType, { en: string; ar: string; icon: string }> = {
    TAB_LEFT: { en: "left the game during question", ar: "غادر اللعبة أثناء السؤال", icon: "⚠️" },
    INACTIVITY: { en: "is inactive", ar: "غير نشط", icon: "💤" },
    SWITCHED_APP: { en: "switched to another app", ar: "انتقل لتطبيق آخر", icon: "📱" },
    SUSPICIOUS_BEHAVIOR: { en: "showed suspicious behavior", ar: "أظهر سلوكاً مشبوهاً", icon: "🕵️" },
  };
  
  const msg = dramaMessages[drama.type];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -30, scale: 0.9 }}
      className="chaos-drama-popup"
      style={{
        position: "fixed",
        top: 20,
        left: "50%",
        transform: `translateX(-50%)`,
        zIndex: 1000,
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
          <div style={{ 
            color: "#ff6b81", 
            fontWeight: 800, 
            fontSize: "1.1rem",
            textAlign: isRTL ? "right" : "left"
          }}>
            🚨 {language === "ar" ? "حدث درامي!" : "DRAMA EVENT!"}
          </div>
          <div style={{ 
            color: "#fff", 
            fontSize: "0.95rem",
            textAlign: isRTL ? "right" : "left"
          }}>
            <strong>{drama.username}</strong> {msg[language]}
          </div>
        </div>
      </div>
      
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "space-between",
        marginTop: 12 
      }}>
        <div style={{ color: "#ff6b81", fontSize: "0.85rem" }}>
          🔥 {language === "ar" ? "مستوى الفوضى:" : "Chaos Level:"} {drama.chaosLevel}%
        </div>
        <button
          onClick={onStartVoting}
          style={{
            background: "linear-gradient(135deg, #ff4757, #ff6348)",
            color: "#fff",
            border: "none",
            borderRadius: 20,
            padding: "10px 20px",
            fontWeight: 700,
            cursor: "pointer",
            fontSize: "0.9rem",
          }}
        >
          {language === "ar" ? "🗳️ صوت الآن!" : "🗳️ VOTE NOW!"}
        </button>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VOTING INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

interface VotingInterfaceProps {
  voting: VotingSession;
  onVote: (vote: VoteOption) => void;
  hasVoted: boolean;
  language: "en" | "ar";
}

export function VotingInterface({ voting, onVote, hasVoted, language }: VotingInterfaceProps) {
  const isRTL = language === "ar";
  const [selectedVote, setSelectedVote] = useState<VoteOption | null>(null);
  
  const voteOptions: Record<VoteOption, { en: string; ar: string; icon: string; color: string }> = {
    FORGIVE: { en: "Forgive", ar: "سامح", icon: "😇", color: "#00e676" },
    REDUCE_SCORE: { en: "Reduce Score", ar: "اخفض النقاط", icon: "👎", color: "#ff4757" },
    BLOCK_QUESTION: { en: "Block Next Question", ar: "احجب السؤال التالي", icon: "🚫", color: "#ffa502" },
  };
  
  const progress = ((voting.duration - voting.timeRemaining) / voting.duration) * 100;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="chaos-voting-interface"
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 1001,
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
        border: "3px solid #ffd700",
        borderRadius: 24,
        padding: 30,
        minWidth: 400,
        boxShadow: "0 30px 80px rgba(0, 0, 0, 0.8)",
      }}
    >
      {/* Timer Bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ 
          height: 6, 
          background: "rgba(255,255,255,0.1)", 
          borderRadius: 3,
          overflow: "hidden"
        }}>
          <div style={{
            height: "100%",
            width: `${100 - progress}%`,
            background: "linear-gradient(90deg, #ffd700, #ffab00)",
            borderRadius: 3,
            transition: "width 1s linear"
          }} />
        </div>
        <div style={{ 
          textAlign: "center", 
          marginTop: 8, 
          color: "#ffd700",
          fontWeight: 700,
          fontSize: "1.2rem"
        }}>
          ⏱️ {Math.ceil(voting.timeRemaining / 1000)}s
        </div>
      </div>
      
      {/* Header */}
      <div style={{ 
        textAlign: "center", 
        marginBottom: 24 
      }}>
        <div style={{ 
          fontSize: "1.5rem", 
          fontWeight: 800, 
          color: "#ffd700",
          marginBottom: 8
        }}>
          🗳️ {language === "ar" ? "التصويت على العقاب" : "Vote for Punishment"}
        </div>
        <div style={{ color: "#fff", fontSize: "1.1rem" }}>
          <strong>{voting.targetUsername}</strong>
        </div>
        <div style={{ color: "#8b95c4", fontSize: "0.9rem", marginTop: 4 }}>
          {language === "ar" 
            ? `${voting.totalVotes} أصوات مسجلة`
            : `${voting.totalVotes} votes cast`}
        </div>
      </div>
      
      {/* Vote Options */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {voting.options.map((option) => {
          const opt = voteOptions[option];
          const isSelected = selectedVote === option;
          
          return (
            <button
              key={option}
              onClick={() => {
                if (!hasVoted) {
                  setSelectedVote(option);
                  onVote(option);
                }
              }}
              disabled={hasVoted}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: 16,
                borderRadius: 16,
                border: `3px solid ${isSelected ? opt.color : "rgba(255,255,255,0.1)"}`,
                background: isSelected ? `${opt.color}20` : "rgba(255,255,255,0.05)",
                cursor: hasVoted ? "not-allowed" : "pointer",
                opacity: hasVoted && !isSelected ? 0.5 : 1,
                transition: "all 0.2s ease",
              }}
            >
              <span style={{ fontSize: "2rem" }}>{opt.icon}</span>
              <span style={{ 
                flex: 1, 
                fontWeight: 700, 
                fontSize: "1.1rem",
                color: "#fff",
                textAlign: isRTL ? "right" : "left"
              }}>
                {opt[language]}
              </span>
              {isSelected && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  style={{ 
                    width: 24, 
                    height: 24, 
                    borderRadius: "50%", 
                    background: opt.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.8rem"
                  }}
                >
                  ✓
                </motion.span>
              )}
            </button>
          );
        })}
      </div>
      
      {hasVoted && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ 
            textAlign: "center", 
            marginTop: 20,
            padding: 12,
            background: "rgba(0, 230, 118, 0.2)",
            borderRadius: 12,
            color: "#00e676",
            fontWeight: 700
          }}
        >
          ✅ {language === "ar" ? "تم التصويت! في انتظار النتيجة..." : "Voted! Waiting for results..."}
        </motion.div>
      )}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAOS MODIFIER DISPLAY
// ═══════════════════════════════════════════════════════════════════════════════

interface ChaosModifierProps {
  modifier: ChaosModifier;
  message: string;
  chaosLevel: number;
  intensity: string;
  language: "en" | "ar";
}

export function ChaosModifierDisplay({ modifier, message, chaosLevel, intensity, language }: ChaosModifierProps) {
  const intensityColors: Record<string, string> = {
    CALM: "#00e676",
    ELEVATED: "#ffd700",
    HIGH: "#ffa502",
    EXTREME: "#ff4757",
    MAXIMUM: "#ff00ff",
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className="chaos-modifier-display"
      style={{
        position: "fixed",
        top: 100,
        right: 20,
        zIndex: 999,
        background: "linear-gradient(135deg, #1a1a2e 0%, #2d1f3d 100%)",
        border: `3px solid ${intensityColors[intensity] || "#ffd700"}`,
        borderRadius: 20,
        padding: 20,
        maxWidth: 320,
        boxShadow: `0 20px 60px ${intensityColors[intensity]}40`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <span style={{ fontSize: "2rem" }}>🎲</span>
        <div style={{ 
          background: intensityColors[intensity],
          color: "#000",
          padding: "4px 12px",
          borderRadius: 12,
          fontWeight: 800,
          fontSize: "0.75rem"
        }}>
          {intensity}
        </div>
      </div>
      
      <div style={{ 
        color: "#fff", 
        fontWeight: 700, 
        fontSize: "1.1rem",
        marginBottom: 8
      }}>
        {message}
      </div>
      
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        gap: 8,
        color: intensityColors[intensity]
      }}>
        <span>🔥</span>
        <span>{language === "ar" ? "مستوى الفوضى:" : "Chaos Level:"} {chaosLevel}%</span>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRAP ROUND WARNING
// ═══════════════════════════════════════════════════════════════════════════════

interface TrapWarningProps {
  targetPlayerId: string;
  message: string;
  description: string;
  language: "en" | "ar";
}

export function TrapRoundWarning({ message, description, language }: TrapWarningProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5 }}
      className="chaos-trap-warning"
      style={{
        position: "fixed",
        top: "30%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 1002,
        background: "linear-gradient(135deg, #3d1f1f 0%, #2d1818 100%)",
        border: "4px solid #ff4757",
        borderRadius: 24,
        padding: 40,
        textAlign: "center",
        boxShadow: "0 30px 100px rgba(255, 71, 87, 0.6)",
        minWidth: 450,
      }}
    >
      <motion.div
        animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
        transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
        style={{ fontSize: "4rem", marginBottom: 16 }}
      >
        🚨
      </motion.div>
      
      <div style={{ 
        fontSize: "2rem", 
        fontWeight: 900, 
        color: "#ff4757",
        marginBottom: 12,
        textShadow: "0 0 30px rgba(255, 71, 87, 0.5)"
      }}>
        {message}
      </div>
      
      <div style={{ 
        color: "#fff", 
        fontSize: "1.2rem",
        marginBottom: 20
      }}>
        {description}
      </div>
      
      <div style={{
        background: "rgba(255, 71, 87, 0.2)",
        borderRadius: 12,
        padding: 16,
        color: "#ff6b81",
        fontWeight: 700,
        fontSize: "1rem"
      }}>
        {language === "ar" 
          ? "💀 إذا فشل الجميع، يعاقب الجميع!"
          : "💀 If everyone fails, everyone is punished!"}
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAOS STATS DISPLAY
// ═══════════════════════════════════════════════════════════════════════════════

interface ChaosStatsProps {
  chaosLevel: number;
  intensity: string;
  totalDramaEvents: number;
  activeVoting: boolean;
  pendingTrap: boolean;
  language: "en" | "ar";
}

export function ChaosStatsDisplay({ 
  chaosLevel, 
  intensity, 
  totalDramaEvents, 
  activeVoting, 
  pendingTrap,
  language 
}: ChaosStatsProps) {
  const intensityColors: Record<string, string> = {
    CALM: "#00e676",
    ELEVATED: "#ffd700",
    HIGH: "#ffa502",
    EXTREME: "#ff4757",
    MAXIMUM: "#ff00ff",
  };
  
  const color = intensityColors[intensity] || "#00e676";
  
  return (
    <div
      className="chaos-stats-display"
      style={{
        position: "fixed",
        bottom: 20,
        left: 20,
        zIndex: 998,
        background: "rgba(0, 0, 0, 0.8)",
        backdropFilter: "blur(10px)",
        border: `2px solid ${color}`,
        borderRadius: 16,
        padding: 16,
        minWidth: 200,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <span style={{ fontSize: "1.5rem" }}>🌀</span>
        <div>
          <div style={{ 
            color: color, 
            fontWeight: 800, 
            fontSize: "1.1rem" 
          }}>
            {intensity}
          </div>
          <div style={{ color: "#8b95c4", fontSize: "0.75rem" }}>
            CHAOS MODE
          </div>
        </div>
      </div>
      
      {/* Chaos Level Bar */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          marginBottom: 4,
          color: "#8b95c4",
          fontSize: "0.75rem"
        }}>
          <span>{language === "ar" ? "مستوى الفوضى" : "Chaos Level"}</span>
          <span>{chaosLevel}%</span>
        </div>
        <div style={{ 
          height: 8, 
          background: "rgba(255,255,255,0.1)", 
          borderRadius: 4,
          overflow: "hidden"
        }}>
          <div style={{
            height: "100%",
            width: `${chaosLevel}%`,
            background: `linear-gradient(90deg, ${color}, ${color}80)`,
            borderRadius: 4,
            transition: "width 0.5s ease"
          }} />
        </div>
      </div>
      
      {/* Status Icons */}
      <div style={{ display: "flex", gap: 16, fontSize: "0.8rem" }}>
        {activeVoting && (
          <span style={{ color: "#ffd700" }}>🗳️ {language === "ar" ? "تصويت" : "Voting"}</span>
        )}
        {pendingTrap && (
          <span style={{ color: "#ff4757" }}>🚨 {language === "ar" ? "فخ" : "Trap"}</span>
        )}
        <span style={{ color: "#8b95c4" }}>
          🔥 {totalDramaEvents} {language === "ar" ? "أحداث" : "events"}
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VOTING RESULTS DISPLAY
// ═══════════════════════════════════════════════════════════════════════════════

interface VotingResultsProps {
  result: VoteOption;
  targetUsername: string;
  voteCounts: Record<VoteOption, number>;
  language: "en" | "ar";
}

export function VotingResultsDisplay({ result, targetUsername, voteCounts, language }: VotingResultsProps) {
  const resultMessages: Record<VoteOption, { en: string; ar: string; icon: string; color: string }> = {
    FORGIVE: { en: "FORGIVEN", ar: "تم التسامح", icon: "😇", color: "#00e676" },
    REDUCE_SCORE: { en: "SCORE REDUCED", ar: "تم خفض النقاط", icon: "👎", color: "#ff4757" },
    BLOCK_QUESTION: { en: "NEXT QUESTION BLOCKED", ar: "تم حجب السؤال التالي", icon: "🚫", color: "#ffa502" },
  };
  
  const msg = resultMessages[result];
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 1001,
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
        border: `4px solid ${msg.color}`,
        borderRadius: 24,
        padding: 30,
        minWidth: 350,
        textAlign: "center",
        boxShadow: `0 30px 80px ${msg.color}40`,
      }}
    >
      <div style={{ fontSize: "4rem", marginBottom: 16 }}>{msg.icon}</div>
      
      <div style={{ 
        fontSize: "1.8rem", 
        fontWeight: 900, 
        color: msg.color,
        marginBottom: 8
      }}>
        {language === "ar" ? "تم التصويت!" : "VOTING COMPLETE!"}
      </div>
      
      <div style={{ color: "#fff", fontSize: "1.1rem", marginBottom: 20 }}>
        <strong>{targetUsername}</strong>
        <br />
        <span style={{ color: msg.color, fontWeight: 700 }}>{msg[language]}</span>
      </div>
      
      {/* Vote Breakdown */}
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        gap: 16,
        padding: 16,
        background: "rgba(255,255,255,0.05)",
        borderRadius: 12
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "1.5rem" }}>😇</div>
          <div style={{ color: "#00e676", fontWeight: 700 }}>{voteCounts.FORGIVE}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "1.5rem" }}>👎</div>
          <div style={{ color: "#ff4757", fontWeight: 700 }}>{voteCounts.REDUCE_SCORE}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "1.5rem" }}>🚫</div>
          <div style={{ color: "#ffa502", fontWeight: 700 }}>{voteCounts.BLOCK_QUESTION}</div>
        </div>
      </div>
    </motion.div>
  );
}

// Export all components
export type { DramaEvent, VotingSession, VoteOption, ChaosModifier };

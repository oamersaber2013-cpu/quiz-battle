"use client";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useGameStore } from "@/store/gameStore";

const RANK_ICONS = ["👑", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣"];

const T = {
  victory: { en: "Victory!", ar: "انتصار ساحق!" },
  battleOver: { en: "Battle Over!", ar: "انتهت المعركة!" },
  youConquered: { en: "You conquered the knowledge arena!", ar: "لقد سيطرت على ساحة المعرفة!" },
  claimedVictory: { en: "claimed victory!", ar: "حقق النصر!" },
  yourRank: { en: "Your Rank", ar: "ترتيبك" },
  score: { en: "Score", ar: "النقاط" },
  correct: { en: "Correct", ar: "صحيحة" },
  avgSpeed: { en: "Avg Speed", ar: "السرعة" },
  finalStandings: { en: "Final Standings", ar: "الترتيب النهائي" },
  playAgain: { en: "Play Again", ar: "العب مجدداً" },
  home: { en: "Home", ar: "الرئيسية" },
  you: { en: "(you)", ar: "(أنت)" },
  pts: { en: "pts", ar: "نقطة" },
  shareResult: { en: "Share Result", ar: "شارك النتيجة" },
  copied: { en: "Copied!", ar: "تم النسخ!" },
  accuracy: { en: "Accuracy", ar: "الدقة" },
  mode: { en: "Mode", ar: "الوضع" },
};

// Simple confetti component
function Confetti() {
  const [particles] = useState(() =>
    Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 3,
      duration: 2 + Math.random() * 3,
      color: ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FF8A65"][Math.floor(Math.random() * 6)],
      size: 4 + Math.random() * 8,
    }))
  );

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: `${p.x}vw`, y: -20, opacity: 1, rotate: 0 }}
          animate={{
            y: "110vh",
            opacity: [1, 1, 0],
            rotate: 360 * (Math.random() > 0.5 ? 1 : -1),
            x: `${p.x + (Math.random() - 0.5) * 20}vw`,
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{
            position: "absolute",
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
          }}
        />
      ))}
    </div>
  );
}

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const { finalResults, userId, resetGame, language, mode } = useGameStore();
  const [shareCopied, setShareCopied] = useState(false);

  const myResult = finalResults.find((r) => r.userId === userId);
  const themeClass = mode ? `theme-${mode.toLowerCase()}` : "";
  const isRTL = language === "ar";
  const isWinner = myResult?.rank === 1;

  function handlePlayAgain() {
    resetGame();
    router.push("/");
  }

  function handleShare() {
    if (!myResult) return;
    const text = isRTL
      ? `حصلت على المرتبة #${myResult.rank} بـ ${myResult.score.toLocaleString()} نقطة في Quiz Battle! 🏆`
      : `I ranked #${myResult.rank} with ${myResult.score.toLocaleString()} points in Quiz Battle! 🏆`;
    navigator.clipboard.writeText(text);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  }

  if (finalResults.length === 0) {
    router.push("/");
    return null;
  }

  const winner = finalResults[0];
  const accuracy = myResult
    ? Math.round((myResult.correctAnswers / Math.max(myResult.totalAnswers, 1)) * 100)
    : 0;

  return (
    <main className={`page ${themeClass}`} dir={isRTL ? "rtl" : "ltr"} style={{ padding: "24px 20px" }}>
      {/* Confetti for winner */}
      {isWinner && <Confetti />}

      <div className="container" style={{ maxWidth: 600 }}>

        {/* Winner celebration */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="text-center"
          style={{ marginBottom: 32 }}
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            style={{ fontSize: "4rem", marginBottom: 8 }}
          >
            {isWinner ? "🏆" : winner.userId === userId ? "🏆" : "⚔️"}
          </motion.div>
          <h1 className="font-black" style={{ fontSize: "clamp(1.5rem, 5vw, 2.5rem)", marginBottom: 8 }}>
            {winner.userId === userId ? T.victory[language] : T.battleOver[language]}
          </h1>
          <p className="text-muted">
            {winner.userId === userId
              ? T.youConquered[language]
              : `${winner.username} ${T.claimedVictory[language]}`}
          </p>

          {/* Mode badge */}
          {mode && (
            <div className="mt-3">
              <span className="badge badge-secondary text-sm">
                {T.mode[language]}: {mode.toUpperCase()}
              </span>
            </div>
          )}

          {myResult && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24, flexWrap: "wrap" }}
            >
              <div className="glass-card p-4" style={{ minWidth: 90 }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--clr-primary)" }}>
                  #{myResult.rank}
                </div>
                <div className="text-muted text-xs">{T.yourRank[language]}</div>
              </div>
              <div className="glass-card p-4" style={{ minWidth: 90 }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--clr-gold)" }}>
                  {myResult.score.toLocaleString()}
                </div>
                <div className="text-muted text-xs">{T.score[language]}</div>
              </div>
              <div className="glass-card p-4" style={{ minWidth: 90 }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--clr-success)" }}>
                  {accuracy}%
                </div>
                <div className="text-muted text-xs">{T.accuracy[language]}</div>
              </div>
              <div className="glass-card p-4" style={{ minWidth: 90 }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--clr-secondary)" }}>
                  {(myResult.avgAnswerTime / 1000).toFixed(1)}s
                </div>
                <div className="text-muted text-xs">{T.avgSpeed[language]}</div>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Full leaderboard */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="glass-card p-6"
          style={{ marginBottom: 20 }}
        >
          <h2 className="font-bold text-lg" style={{ marginBottom: 16, textAlign: isRTL ? "right" : "left" }}>{T.finalStandings[language]}</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {finalResults.map((r, i) => (
              <motion.div
                key={r.userId}
                initial={{ x: isRTL ? 30 : -30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.6 + i * 0.08 }}
                className={`player-row ${r.userId === userId ? "current-user" : ""}`}
                style={{
                  border: i === 0 ? "2px solid rgba(255,215,0,0.3)" : undefined,
                  background: i === 0 ? "rgba(255,215,0,0.05)" : undefined,
                }}
              >
                <div style={{
                  width: 36,
                  height: 36,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: i < 3 ? "1.5rem" : "0.9rem",
                  fontWeight: 700,
                  color: i === 0 ? "var(--clr-gold)" : "var(--clr-text-3)",
                  flexShrink: 0,
                  [isRTL ? "marginLeft" : "marginRight"]: 10
                }}>
                  {RANK_ICONS[i] || `#${i + 1}`}
                </div>

                <div className="player-avatar" style={{
                  background: i === 0 ? "var(--grad-fire)" : "var(--grad-primary)",
                  [isRTL ? "marginLeft" : "marginRight"]: 12
                }}>
                  {r.username.charAt(0).toUpperCase()}
                </div>

                <div style={{ flex: 1, textAlign: isRTL ? "right" : "left" }}>
                  <div style={{ fontWeight: 600 }}>
                    {r.username}
                    {r.userId === userId && <span className="text-muted text-sm"> {T.you[language]}</span>}
                  </div>
                  <div className="text-xs text-muted">
                    {r.correctAnswers}/{r.totalAnswers} {isRTL ? "إجابة" : "correct"} · {(r.avgAnswerTime / 1000).toFixed(1)}s
                  </div>
                </div>

                <div style={{ textAlign: isRTL ? "left" : "right" }}>
                  <div className="font-mono font-bold" style={{ color: i === 0 ? "var(--clr-gold)" : "var(--clr-primary)" }}>
                    {r.score.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted">{T.pts[language]}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1 }}
          style={{ display: "flex", gap: 12, flexWrap: "wrap" }}
        >
          <button className="btn btn-primary btn-lg" style={{ flex: 1, height: 60, minWidth: 140 }} onClick={handlePlayAgain}>
            ⚔️ {T.playAgain[language]}
          </button>
          {myResult && (
            <button
              className="btn btn-secondary"
              style={{ height: 60, minWidth: 140 }}
              onClick={handleShare}
            >
              {shareCopied ? `✓ ${T.copied[language]}` : `📋 ${T.shareResult[language]}`}
            </button>
          )}
          <button className="btn btn-ghost" style={{ height: 60, minWidth: 100 }} onClick={() => router.push("/")}>
            🏠 {T.home[language]}
          </button>
        </motion.div>
      </div>
    </main>
  );
}

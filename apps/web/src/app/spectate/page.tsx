"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { GameStatus } from "@quiz-battle/shared";
import { useGameStore } from "@/store/gameStore";
import { useDocumentLocale } from "@/hooks/useDocumentLocale";

interface ActiveGame {
  gameId: string;
  mode: string;
  difficulty: string;
  status: GameStatus;
  playerCount: number;
  maxPlayers: number;
  currentRound: number;
  totalRounds: number;
}

const MODE_COLORS: Record<string, string> = {
  classic: "#6C63FF",
  survival: "#FF4757",
  conquest: "#2ED573",
  chaos: "#FF00FF",
  custom: "#8B5CF6",
};

const STATUS_CONFIG: Record<GameStatus, { label: string; color: string; bg: string }> = {
  [GameStatus.Lobby]: { label: "Lobby", color: "#00e676", bg: "rgba(0,230,118,0.1)" },
  [GameStatus.Countdown]: { label: "Starting", color: "#ffa502", bg: "rgba(255,165,2,0.1)" },
  [GameStatus.Question]: { label: "Live", color: "#ff6b6b", bg: "rgba(255,107,107,0.1)" },
  [GameStatus.AnswerReveal]: { label: "Reveal", color: "#ffa502", bg: "rgba(255,165,2,0.1)" },
  [GameStatus.PowerUpSelect]: { label: "Power-Ups", color: "#6c63ff", bg: "rgba(108,99,255,0.1)" },
  [GameStatus.Results]: { label: "Results", color: "#45B7D1", bg: "rgba(69,183,209,0.1)" },
  [GameStatus.Ended]: { label: "Ended", color: "#a0a0a0", bg: "rgba(160,160,160,0.1)" },
};

const STATUS_LABELS_AR: Record<GameStatus, string> = {
  [GameStatus.Lobby]: "قاعة الانتظار", [GameStatus.Countdown]: "تبدأ قريبًا",
  [GameStatus.Question]: "مباشر", [GameStatus.AnswerReveal]: "كشف الإجابة",
  [GameStatus.PowerUpSelect]: "اختيار القدرات", [GameStatus.Results]: "النتائج", [GameStatus.Ended]: "انتهت",
};
const MODE_LABELS_AR: Record<string, string> = {
  classic: "كلاسيكي", survival: "البقاء", conquest: "فتح الأقاليم", chaos: "الفوضى", custom: "مخصص",
};
const DIFFICULTY_LABELS_AR: Record<string, string> = {
  novice: "مبتدئ", scholar: "عالم", sage: "حكيم", master: "خبير", legend: "أسطورة",
};

export default function SpectatePage() {
  const [games, setGames] = useState<ActiveGame[]>([]);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const router = useRouter();
  const language = useGameStore(state => state.language);
  const isAr = language === "ar";
  useDocumentLocale(language);
  const [joiningGame, setJoiningGame] = useState<string | null>(null);
  const [guestFailed, setGuestFailed] = useState(false);
  const joiningRef = useRef(false);

  const fetchGames = useCallback(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000"}/api/games/active`)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((data) => {
        if (!Array.isArray(data)) throw new Error("Invalid games list");
        setFailed(false);
        setGames(data);
        setLastUpdated(new Date());
        setLoading(false);
      })
      .catch((err) => {
        setFailed(true);
        console.error("Failed to fetch active games:", err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchGames();
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchGames, 10000);
    return () => clearInterval(interval);
  }, [fetchGames]);

  const handleSpectate = async (gameId: string) => {
    if (joiningRef.current) return;
    joiningRef.current = true;
    setJoiningGame(gameId);
    setGuestFailed(false);
    try {
      const store = useGameStore.getState();
      if (!store.userId || !store.token) {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000"}/api/auth/guest`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}),
        });
        if (!response.ok) throw new Error("Guest sign-in failed");
        const guest = await response.json();
        if (typeof guest.userId !== "string" || typeof guest.token !== "string") throw new Error("Invalid guest identity");
        store.setAuth({ ...guest, isGuest: true });
      }
      router.push(`/lobby/${gameId}?spectate=true`);
    } catch {
      setGuestFailed(true);
    } finally {
      joiningRef.current = false;
      setJoiningGame(null);
    }
  };

  const inProgressGames = games.filter((g) => g.status !== GameStatus.Lobby && g.status !== GameStatus.Ended);
  const lobbyGames = games.filter((g) => g.status === GameStatus.Lobby);

  return (
    <main className="page" dir={isAr ? "rtl" : "ltr"} style={{ padding: "24px 20px" }}>
      <div className="container" style={{ maxWidth: 900 }}>
        {/* Header */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h1 className="font-black text-2xl">👁️ {isAr ? "شاهد المعارك المباشرة" : "Watch Live Matches"}</h1>
            <span className="badge badge-primary animate-pulse">● {isAr ? "مباشر" : "LIVE"}</span>
          </div>
          <Link href="/" className="btn btn-secondary text-sm" style={{ padding: "8px 16px" }}>
            🏠 {isAr ? "الرئيسية" : "Home"}
          </Link>
        </div>

        {lastUpdated && (
          <div className="text-muted text-xs mb-6">
            {isAr ? "آخر تحديث:" : "Last updated:"} {lastUpdated.toLocaleTimeString(language)}
            <button onClick={fetchGames} className="btn btn-ghost btn-xs" style={{ padding: "2px 8px", marginInlineStart: 12 }}>
              🔄 {isAr ? "تحديث" : "Refresh"}
            </button>
          </div>
        )}

        {failed && <div role="alert" className="glass-card p-4">{isAr ? "تعذر تحديث المعارك المباشرة." : "Could not refresh live matches."} <button className="btn btn-secondary" onClick={fetchGames}>{isAr ? "حاول مجددًا" : "Retry"}</button></div>}
        {guestFailed && <div role="alert" className="glass-card p-4">{isAr ? "تعذر الدخول كضيف. حاول اختيار المعركة مجددًا." : "Could not sign in as a guest. Please select the match to retry."}</div>}
        {loading ? (
          <div className="text-center p-8 text-muted animate-pulse">{isAr ? "جارٍ البحث عن المعارك..." : "Scanning the arenas..."}</div>
        ) : games.length === 0 && !failed ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-8 text-center text-muted"
          >
            <div style={{ fontSize: "2rem", marginBottom: 8 }}>😴</div>
            {isAr ? "لا توجد معارك نشطة حاليًا. ابدأ معركة جديدة!" : "No active battles at the moment. Why not start one?"}
            <div className="mt-4">
              <Link href="/" className="btn btn-primary btn-sm">
                ⚔️ {isAr ? "ابدأ معركة" : "Start a Battle"}
              </Link>
            </div>
          </motion.div>
        ) : (
          <>
            {/* In Progress Section */}
            {inProgressGames.length > 0 && (
              <div className="mb-8">
                <h2 className="font-bold text-lg mb-4" style={{ color: "var(--clr-primary)" }}>
                  🔴 {isAr ? "معارك جارية" : "In Progress"} ({inProgressGames.length})
                </h2>
                <div className="modes-grid">
                  <AnimatePresence>
                    {inProgressGames.map((g, i) => (
                      <SpectatorGameCard
                        key={g.gameId}
                        game={g}
                        index={i}
                        language={language}
                        disabled={joiningGame !== null}
                        joining={joiningGame === g.gameId}
                        onSpectate={() => handleSpectate(g.gameId)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Lobby Section */}
            {lobbyGames.length > 0 && (
              <div>
                <h2 className="font-bold text-lg mb-4 text-muted">
                  🟢 {isAr ? "بانتظار البدء" : "Waiting to Start"} ({lobbyGames.length})
                </h2>
                <div className="modes-grid">
                  {lobbyGames.map((g, i) => (
                    <SpectatorGameCard
                      key={g.gameId}
                      game={g}
                      index={i}
                      language={language}
                      disabled={joiningGame !== null}
                      joining={joiningGame === g.gameId}
                      onSpectate={() => handleSpectate(g.gameId)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function SpectatorGameCard({
  game,
  index,
  onSpectate,
  language,
  disabled,
  joining,
}: {
  game: ActiveGame;
  index: number;
  onSpectate: () => void;
  language: "en" | "ar";
  disabled: boolean;
  joining: boolean;
}) {
  const isAr = language === "ar";
  const statusConfig = STATUS_CONFIG[game.status] || STATUS_CONFIG[GameStatus.Lobby];
  const statusLabel = isAr ? (STATUS_LABELS_AR[game.status] || "قاعة الانتظار") : statusConfig.label;
  const modeColor = MODE_COLORS[game.mode.toLowerCase()] || "#6C63FF";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="glass-card p-5"
      style={{
        borderInlineStart: `4px solid ${modeColor}`,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span className="font-bold" style={{ fontSize: "1.1rem", color: modeColor }}>
          {isAr ? (MODE_LABELS_AR[game.mode.toLowerCase()] || "معركة") : game.mode.toUpperCase()}
        </span>
        <span
          className="text-xs font-bold px-2 py-1 rounded-full"
          style={{
            color: statusConfig.color,
            background: statusConfig.bg,
            border: `1px solid ${statusConfig.color}44`,
          }}
        >
          {game.status === GameStatus.Question ? "● " : ""}
          {statusLabel}
        </span>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
        <div className="text-sm">
          <span className="text-muted">👥 {isAr ? "اللاعبون" : "Players"}</span>
          <div className="font-bold">{game.playerCount}/{game.maxPlayers}</div>
        </div>
        <div className="text-sm">
          <span className="text-muted">🎯 {isAr ? "الجولة" : "Round"}</span>
          <div className="font-bold">{game.currentRound}/{game.totalRounds}</div>
        </div>
        <div className="text-sm">
          <span className="text-muted">⚡ {isAr ? "الصعوبة" : "Difficulty"}</span>
          <div className="font-bold" style={{ textTransform: "capitalize" }}>{isAr ? (DIFFICULTY_LABELS_AR[game.difficulty.toLowerCase()] || "غير محددة") : game.difficulty}</div>
        </div>
        <div className="text-sm">
          <span className="text-muted">🎮 {isAr ? "الحالة" : "Status"}</span>
          <div className="font-bold">{statusLabel}</div>
        </div>
      </div>

      {/* Progress bar for rounds */}
      {game.totalRounds > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              height: 4,
              background: "rgba(255,255,255,0.1)",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(game.currentRound / game.totalRounds) * 100}%` }}
              transition={{ duration: 1, delay: index * 0.1 }}
              style={{
                height: "100%",
                background: modeColor,
                borderRadius: 2,
              }}
            />
          </div>
          <div className="text-xs text-muted mt-1" style={{ textAlign: "end" }}>
            {Math.round((game.currentRound / game.totalRounds) * 100)}% {isAr ? "مكتمل" : "complete"}
          </div>
        </div>
      )}

      {/* Spectate Button */}
      <button
        className="btn btn-primary w-full"
        onClick={onSpectate}
        disabled={disabled}
        style={{
          background: `${modeColor}22`,
          border: `1px solid ${modeColor}44`,
          color: modeColor,
        }}
      >
        👁️ {joining ? (isAr ? "جارٍ الدخول..." : "Joining...") : (isAr ? "مشاهدة" : "Spectate")}
      </button>
    </motion.div>
  );
}

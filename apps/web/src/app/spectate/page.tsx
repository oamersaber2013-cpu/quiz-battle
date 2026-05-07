"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { GameStatus } from "@quiz-battle/shared";

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

export default function SpectatePage() {
  const [games, setGames] = useState<ActiveGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const router = useRouter();

  const fetchGames = useCallback(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000"}/api/games/active`)
      .then((r) => r.json())
      .then((data) => {
        setGames(data);
        setLastUpdated(new Date());
        setLoading(false);
      })
      .catch((err) => {
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

  const handleSpectate = (gameId: string) => {
    router.push(`/lobby/${gameId}?spectate=true`);
  };

  const inProgressGames = games.filter((g) => g.status === GameStatus.Question || g.status === GameStatus.AnswerReveal);
  const lobbyGames = games.filter((g) => g.status === GameStatus.Lobby);

  return (
    <main className="page" style={{ padding: "24px 20px" }}>
      <div className="container" style={{ maxWidth: 900 }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h1 className="font-black text-2xl">👁️ Watch Live Matches</h1>
            <span className="badge badge-primary animate-pulse">● LIVE</span>
          </div>
          <Link href="/" className="btn btn-secondary text-sm" style={{ padding: "8px 16px" }}>
            🏠 Home
          </Link>
        </div>

        {lastUpdated && (
          <div className="text-muted text-xs mb-6">
            Last updated: {lastUpdated.toLocaleTimeString()}
            <button onClick={fetchGames} className="btn btn-ghost btn-xs ml-3" style={{ padding: "2px 8px" }}>
              🔄 Refresh
            </button>
          </div>
        )}

        {loading ? (
          <div className="text-center p-8 text-muted animate-pulse">Scanning the arenas...</div>
        ) : games.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-8 text-center text-muted"
          >
            <div style={{ fontSize: "2rem", marginBottom: 8 }}>😴</div>
            No active battles at the moment. Why not start one?
            <div className="mt-4">
              <Link href="/" className="btn btn-primary btn-sm">
                ⚔️ Start a Battle
              </Link>
            </div>
          </motion.div>
        ) : (
          <>
            {/* In Progress Section */}
            {inProgressGames.length > 0 && (
              <div className="mb-8">
                <h2 className="font-bold text-lg mb-4" style={{ color: "var(--clr-primary)" }}>
                  🔴 In Progress ({inProgressGames.length})
                </h2>
                <div className="modes-grid">
                  <AnimatePresence>
                    {inProgressGames.map((g, i) => (
                      <SpectatorGameCard
                        key={g.gameId}
                        game={g}
                        index={i}
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
                  🟢 Waiting to Start ({lobbyGames.length})
                </h2>
                <div className="modes-grid">
                  {lobbyGames.map((g, i) => (
                    <SpectatorGameCard
                      key={g.gameId}
                      game={g}
                      index={i}
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
}: {
  game: ActiveGame;
  index: number;
  onSpectate: () => void;
}) {
  const statusConfig = STATUS_CONFIG[game.status] || STATUS_CONFIG[GameStatus.Lobby];
  const modeColor = MODE_COLORS[game.mode.toLowerCase()] || "#6C63FF";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="glass-card p-5"
      style={{
        borderLeft: `4px solid ${modeColor}`,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span className="font-bold" style={{ fontSize: "1.1rem", color: modeColor }}>
          {game.mode.toUpperCase()}
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
          {statusConfig.label}
        </span>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
        <div className="text-sm">
          <span className="text-muted">👥 Players</span>
          <div className="font-bold">{game.playerCount}/{game.maxPlayers}</div>
        </div>
        <div className="text-sm">
          <span className="text-muted">🎯 Round</span>
          <div className="font-bold">{game.currentRound}/{game.totalRounds}</div>
        </div>
        <div className="text-sm">
          <span className="text-muted">⚡ Difficulty</span>
          <div className="font-bold" style={{ textTransform: "capitalize" }}>{game.difficulty}</div>
        </div>
        <div className="text-sm">
          <span className="text-muted">🎮 Status</span>
          <div className="font-bold">{statusConfig.label}</div>
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
          <div className="text-xs text-muted mt-1" style={{ textAlign: "right" }}>
            {Math.round((game.currentRound / game.totalRounds) * 100)}% complete
          </div>
        </div>
      )}

      {/* Spectate Button */}
      <button
        className="btn btn-primary w-full"
        onClick={onSpectate}
        style={{
          background: `${modeColor}22`,
          border: `1px solid ${modeColor}44`,
          color: modeColor,
        }}
      >
        👁️ Spectate
      </button>
    </motion.div>
  );
}

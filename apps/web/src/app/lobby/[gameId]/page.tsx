"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { GameStatus, GameMode } from "@quiz-battle/shared";
import { useGameStore } from "@/store/gameStore";
import { connectSocket, emitJoinGame, emitStartGame, emitSpectateGame, emitChaosInit } from "@/lib/socket";
import { ChatWindow } from "@/components/ChatWindow";
import { CustomModeBuilder } from "@/components/CustomModeBuilder";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LoadingSpinner } from "@/components/LoadingSpinner";

const T = {
  battleLobby: { en: "Battle Lobby", ar: "غرفة المعركة" },
  warriorsReady: { en: "warriors ready", ar: "محاربون مستعدون" },
  battleCode: { en: "BATTLE CODE", ar: "كود المعركة" },
  copy: { en: "Copy", ar: "نسخ" },
  copied: { en: "Copied!", ar: "تم النسخ!" },
  startBattle: { en: "Start Battle", ar: "ابدأ المعركة" },
  waitingHost: { en: "Waiting for host...", ar: "في انتظار المضيف..." },
  host: { en: "Host", ar: "المضيف" },
  you: { en: "you", ar: "أنت" },
  warriors: { en: "Warriors", ar: "المحاربون" },
  joining: { en: "Joining battle...", ar: "جاري الانضمام للمعركة..." },
  spectating: { en: "👁️ You are spectating", ar: "👁️ أنت تشاهد الآن" },
  configureCustom: { en: "⚙️ Configure Custom Mode", ar: "⚙️ إعداد الوضع المخصص" },
  customConfigSaved: { en: "Custom configuration saved!", ar: "تم حفظ الإعدادات المخصصة!" },
};

const CATEGORY_LABELS: Record<string, { en: string; ar: string }> = {
  general: { en: "General Knowledge", ar: "معلومات عامة" },
  islamic: { en: "Islamic Knowledge", ar: "الثقافة الإسلامية" },
  science: { en: "Science & Tech", ar: "العلوم والتكنولوجيا" },
  history: { en: "History", ar: "التاريخ" },
  geography: { en: "Geography", ar: "الجغرافيا" },
  anime: { en: "Anime & Manga", ar: "الأنمي والمانجا" },
  sports: { en: "Sports", ar: "الرياضة" },
};

const DIFF_COLORS: Record<string, string> = {
  novice: "#00e676",
  scholar: "#00d4ff",
  sage: "#ffa502",
  master: "#ff6b6b",
  legend: "#ffd700",
};

export default function LobbyPage() {
  return (
    <ErrorBoundary>
      <LobbyPageContent />
    </ErrorBoundary>
  );
}

function LobbyPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const gameId = params.gameId as string;
  const isSpectating = searchParams.get("spectate") === "true";

  const { 
    userId, username, token, isGuest, joinCode, mode, difficulty, category, 
    players, status, addToast, language, hostId
  } = useGameStore();
  
  const [joining, setJoining] = useState(true);
  const [starting, setStarting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showCustomBuilder, setShowCustomBuilder] = useState(false);
  const [customConfig, setCustomConfig] = useState<any>(null);

  const isRTL = language === "ar";
  // Use hostId from store — reliable even if players reorder
  const isHost = !!userId && !!hostId && userId === hostId;

  useEffect(() => {
    if (!userId) {
      router.push("/");
      return;
    }

    const socket = connectSocket(userId, username, token || undefined, isGuest);
    let mounted = true;

    async function joinRoom() {
      if (!mounted) return;
      
      try {
        if (isSpectating) {
          emitSpectateGame(gameId);
          if (mounted) setJoining(false);
        } else {
          const res = await emitJoinGame(gameId);
          if (!mounted) return;
          
          if (!res.success) {
            addToast("error", res.error || (isRTL ? "فشل الانضمام للغرفة" : "Failed to join room"));
            router.push("/");
          } else if (res.room) {
            // Sync hostId & language from server immediately
            useGameStore.getState().syncRoom({
              ...res.room,
              players: res.players || [],
              currentRound: 0,
            });
          }
          if (mounted) setJoining(false);
        }
      } catch (error) {
        console.error("Join room error:", error);
        if (mounted) {
          addToast("error", isRTL ? "فشل الانضمام للغرفة" : "Failed to join room");
          setJoining(false);
        }
      }
    }

    if (socket.connected) {
      joinRoom();
    } else {
      socket.once("connect", joinRoom);
    }

    return () => {
      mounted = false;
      socket.off("connect", joinRoom);
    };
  }, [gameId, userId]);

  useEffect(() => {
    // Redirect to game when status is anything except Lobby (for ALL modes)
    if (status && status !== GameStatus.Lobby) {
      router.push(`/game/${gameId}${isSpectating ? '?spectate=true' : ''}`);
    }
  }, [status, gameId, router, isSpectating]);

  async function handleStart() {
    setStarting(true);
    
    // If CHAOS mode, initialize chaos system first
    if (mode === GameMode.Chaos) {
      emitChaosInit(gameId, "RANDOM");
    }
    
    const res = await emitStartGame(gameId);
    if (!res.success) {
      addToast("error", res.error || (isRTL ? "تعذر بدء المعركة" : "Unable to start battle"));
      setStarting(false);
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(joinCode || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }


  if (joining) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100dvh" }}>
        <LoadingSpinner size="lg" message={T.joining[language]} />
      </div>
    );
  }

  return (
    <main className="page" dir={isRTL ? "rtl" : "ltr"} style={{ padding: "24px 20px" }}>
      <div className="container" style={{ maxWidth: 700 }}>

        {/* Header */}
        <div className="animate-fade-in" style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: "1.5rem" }}>🏰</span>
            <h1 className="text-2xl font-bold">{T.battleLobby[language]}</h1>
            <span className="badge badge-primary">{mode}</span>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <span className="text-muted text-sm">{players.length} {T.warriorsReady[language]}</span>
            {difficulty && (
              <span className="badge" style={{
                color: DIFF_COLORS[difficulty] || "white",
                background: `${DIFF_COLORS[difficulty]}18`,
                border: `1px solid ${DIFF_COLORS[difficulty]}44`,
              }}>
                {difficulty.toUpperCase()}
              </span>
            )}
            <span className="badge badge-secondary" style={{ border: "1px solid var(--clr-primary)" }}>
              {language === 'ar' ? "العربية 🇸🇦" : "English 🇺🇸"}
            </span>
            {category && category.split(", ").map(catId => {
              const cleanId = catId.trim().toLowerCase();
              const label = CATEGORY_LABELS[cleanId];
              if (!label) return null;
              return (
                <span key={cleanId} className="badge badge-gold" style={{ border: "1px solid var(--clr-gold)" }}>
                  {label[language]}
                </span>
              );
            })}
          </div>
        </div>

        {/* Join code & Invite Link */}
        <div className="glass-card p-6 animate-fade-in" style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 20 }}>
            <div style={{ textAlign: isRTL ? "right" : "left" }}>
              <div className="text-muted text-sm" style={{ marginBottom: 6 }}>{T.battleCode[language]}</div>
              <div className="font-mono font-bold" style={{ fontSize: "2.5rem", letterSpacing: "0.25em", color: "var(--clr-primary)" }}>
                {joinCode || "------"}
              </div>
            </div>
            <button className="btn btn-secondary" onClick={copyCode}>
              {copied ? `✓ ${T.copied[language]}` : `📋 ${T.copy[language]}`}
            </button>
          </div>
          
          <div style={{ borderTop: "1px solid var(--clr-border)", paddingTop: 20 }}>
            <button 
              className="btn btn-ghost w-full" 
              style={{ justifyContent: "center", gap: 10, color: "var(--clr-primary)" }}
              onClick={() => {
                const url = window.location.origin + "/lobby/" + gameId;
                navigator.clipboard.writeText(url);
                addToast("success", isRTL ? "تم نسخ رابط المعركة!" : "Battle link copied!");
              }}
            >
              🔗 {isRTL ? "نسخ رابط الدعوة المباشر" : "Copy Direct Invite Link"}
            </button>
          </div>
        </div>

        {/* Players */}
        <div className="glass-card p-6 animate-fade-in" style={{ marginBottom: 20 }}>
          <h2 className="text-lg font-bold" style={{ marginBottom: 16, textAlign: isRTL ? "right" : "left" }}>{T.warriors[language]}</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {players.map((player, i) => (
              <div
                key={player.userId}
                className={`player-row ${player.userId === userId ? "current-user" : ""}`}
              >
                <div className="player-avatar" style={{
                  background: i === 0 ? "var(--grad-fire)" : "var(--grad-primary)",
                  [isRTL ? "marginLeft" : "marginRight"]: 12
                }}>
                  {player.username.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, textAlign: isRTL ? "right" : "left" }}>
                  <div style={{ fontWeight: 600 }}>
                    {player.username}
                    {player.userId === userId && <span className="text-muted text-sm"> ({T.you[language]})</span>}
                  </div>
                  {player.userId === hostId && <div className="text-xs" style={{ color: "var(--clr-gold)" }}>👑 {T.host[language]}</div>}
                </div>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: player.isConnected ? "var(--clr-success)" : "var(--clr-danger)" }} />
              </div>
            ))}
          </div>
        </div>

        {/* Custom Mode Configuration (host only, Custom mode) */}
        {mode === GameMode.Custom && isHost && (
          <div className="animate-fade-in" style={{ marginBottom: 20 }}>
            {!showCustomBuilder ? (
              <button
                className="btn btn-secondary w-full"
                onClick={() => setShowCustomBuilder(true)}
                style={{ height: 50, fontSize: "1rem" }}
              >
                {T.configureCustom[language]}
              </button>
            ) : (
              <div className="glass-card p-4">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span className="font-bold">{T.configureCustom[language]}</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowCustomBuilder(false)}>
                    ✕
                  </button>
                </div>
                <CustomModeBuilder
                  isOpen={true}
                  onClose={() => setShowCustomBuilder(false)}
                  onSave={(config) => {
                    setCustomConfig(config);
                    addToast("success", T.customConfigSaved[language]);
                  }}
                  language={language}
                />
              </div>
            )}
          </div>
        )}

        {/* Start button (host only) */}
        {isSpectating ? (
          <div className="glass-card p-4 text-center text-muted" style={{ border: "1px solid var(--clr-primary)" }}>
            {T.spectating[language]}
          </div>
        ) : isHost ? (
          <button
            className="btn btn-primary btn-lg w-full animate-pulse-glow"
            onClick={handleStart}
            disabled={starting || players.length < 1}
            style={{ height: 60, fontSize: "1.2rem" }}
          >
            {starting ? "..." : `⚔️ ${T.startBattle[language]} (${players.length})`}
          </button>
        ) : (
          <div className="glass-card p-4 text-center text-muted">
            ⏳ {T.waitingHost[language]}
          </div>
        )}

        <div style={{ marginTop: 24 }}>
          <ChatWindow gameId={gameId} />
        </div>
      </div>
    </main>
  );
}

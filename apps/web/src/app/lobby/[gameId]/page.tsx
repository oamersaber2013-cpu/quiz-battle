"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { GameStatus, GameMode } from "@quiz-battle/shared";
import { useGameStore } from "@/store/gameStore";
import { emitStartGame } from "@/lib/socket";
import { useGameConnection } from "@/hooks/useGameConnection";
import { useDocumentLocale } from "@/hooks/useDocumentLocale";
import { RoomPasswordPrompt } from "@/components/RoomPasswordPrompt";
import { ChatWindow } from "@/components/ChatWindow";
import { BattleHeader, MODE_NAMES, DIFFICULTY_NAMES } from "@/components/BattleHeader";
import styles from "@/components/ActiveExperience.module.css";

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
    userId, joinCode, mode, difficulty, category,
    players, status, addToast, language, hostId, customSettings
  } = useGameStore();
  
  const { joining, passwordRequired, passwordError, passwordPending, submitPassword } = useGameConnection(gameId, isSpectating);
  const [starting, setStarting] = useState(false);
  const [copied, setCopied] = useState(false);

  const isRTL = language === "ar";
  useDocumentLocale(language);
  // Use hostId from store — reliable even if players reorder
  const isHost = !!userId && !!hostId && userId === hostId;

  useEffect(() => {
    // Redirect to game when status is anything except Lobby (for ALL modes)
    if (!joining && status && status !== GameStatus.Lobby) {
      router.push(`/game/${gameId}${isSpectating ? '?spectate=true' : ''}`);
    }
  }, [status, gameId, router, isSpectating, joining]);

  async function handleStart() {
    setStarting(true);
    try {
      const res = await emitStartGame(gameId);
      if (!res.success) {
        addToast("error", res.error || (isRTL ? "تعذر بدء المعركة" : "Unable to start battle"));
        setStarting(false);
      }
    } catch {
      addToast("error", isRTL ? "تعذر بدء المعركة. حاول مرة أخرى." : "Unable to start battle. Please try again.");
      setStarting(false);
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(joinCode || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { addToast("error", isRTL ? "تعذر النسخ. يمكنك تحديد الرمز ونسخه." : "Could not copy. Select the code to copy it."); }
  }


  if (passwordRequired) {
    return <RoomPasswordPrompt language={language} error={passwordError} pending={passwordPending} onSubmit={submitPassword} onCancel={() => router.push("/")} />;
  }

  if (joining) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100dvh" }}>
        <LoadingSpinner size="lg" message={T.joining[language]} />
      </div>
    );
  }

  return (
    <main className={styles.page} dir={isRTL ? "rtl" : "ltr"}>
      <div className={styles.frame}>
        <BattleHeader language={language} stage="lobby" />
        <header className={styles.pageHeading}>
          <p className={styles.eyebrow}>{isSpectating ? (isRTL ? "المشاهدة" : "Spectating") : (isHost ? T.host[language] : (isRTL ? "أنت في الغرفة" : "You're in the room"))}</p>
          <h1 className={styles.heading}>{T.battleLobby[language]}</h1>
          <p className={styles.lede}>{isRTL ? "شارك الرمز مع أصدقائك. يبدأ المضيف المعركة عندما تكونون جاهزين." : "Share the code with your friends. The host starts when everyone is ready."}</p>
          <div className={styles.tagRow}>
            {mode && <span className={styles.tag}>{MODE_NAMES[mode]?.[language] || mode}</span>}
            {difficulty && <span className={styles.tag}>{DIFFICULTY_NAMES[difficulty]?.[language] || difficulty}</span>}
            <span className={styles.tag}>{isRTL ? "العربية" : "English"}</span>
            {category && category.split(/,\s*/).map(catId => { const label = CATEGORY_LABELS[catId.trim().toLowerCase()]; return label ? <span className={styles.tag} key={catId}>{label[language]}</span> : null; })}
          </div>
        </header>
        <div className={styles.lobbyLayout}>
          <div className={styles.stack}>
            <section className={styles.surface} aria-label={isRTL ? "دعوة اللاعبين" : "Invite players"}>
              <div className={styles.codeLine}>
                <div><p className={styles.eyebrow}>{T.battleCode[language]}</p><bdi className={styles.code}>{joinCode || "------"}</bdi></div>
                <button type="button" className="btn btn-secondary" onClick={copyCode}>{copied ? `✓ ${T.copied[language]}` : T.copy[language]}</button>
              </div>
              <div className={styles.inviteLink}>
                <button type="button" className="btn btn-ghost" onClick={async () => {
                  try { await navigator.clipboard.writeText(window.location.origin + "/lobby/" + gameId); addToast("success", isRTL ? "تم نسخ رابط المعركة!" : "Battle link copied!"); }
                  catch { addToast("error", isRTL ? "تعذر نسخ الرابط." : "Could not copy the link."); }
                }}>↗ {isRTL ? "نسخ رابط الدعوة" : "Copy invite link"}</button>
              </div>
            </section>
            <section className={styles.surface} aria-labelledby="lobby-players">
              <h2 className={styles.sectionHeading} id="lobby-players">{T.warriors[language]} <small>{players.length} {isRTL ? "في الغرفة" : "in the room"}</small></h2>
              <div className={styles.playerList}>
                {players.map(player => <div key={player.userId} className={styles.playerRow}>
                  <span className={styles.avatar} aria-hidden="true">{player.username.charAt(0).toUpperCase()}</span>
                  <div className={styles.playerName}><strong><bdi>{player.username}</bdi> {player.userId === userId && <small>({T.you[language]})</small>}</strong>
                    <small>{player.userId === hostId ? T.host[language] : player.isBot ? (isRTL ? "لاعب آلي" : "AI player") : (isRTL ? "لاعب" : "Player")}</small>
                  </div>
                  <span className={styles.presence} data-connected={player.isConnected}><span className={styles.presenceDot} aria-hidden="true" /><span>{player.isConnected ? (isRTL ? "متصل" : "Connected") : (isRTL ? "يعيد الاتصال" : "Reconnecting")}</span></span>
                </div>)}
              </div>
            </section>
            {mode === GameMode.Custom && customSettings && <section className={styles.surface} aria-label={isRTL ? "إعدادات المعركة المخصصة" : "Custom battle settings"}>
              <h2 className={styles.sectionHeading}>{customSettings.name}</h2>
              <p>{customSettings.rounds} {isRTL ? "جولات" : "rounds"} · {customSettings.timePerQuestion} {isRTL ? "ثانية لكل سؤال" : "seconds per question"}</p>
              <p className="text-muted">{isRTL ? "الحد الأقصى للاعبين" : "Player limit"} {customSettings.maxPlayers} · {isRTL ? "القوى المتاحة" : "Available powers"} {customSettings.enabledPowerUps.length}</p>
            </section>}
            {isSpectating ? <p className={styles.wait}>{T.spectating[language]}</p> : isHost
              ? <button type="button" className={`btn btn-primary ${styles.start}`} onClick={handleStart} disabled={starting || players.length < 1}>{starting ? (isRTL ? "جارٍ البدء…" : "Starting…") : T.startBattle[language]}</button>
              : <p className={styles.wait} role="status">{T.waitingHost[language]}</p>}
          </div>
          <aside className={styles.sideRail}><ChatWindow gameId={gameId} /></aside>
        </div>
      </div>
    </main>
  );
}

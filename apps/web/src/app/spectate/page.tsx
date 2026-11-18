"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GameStatus } from "@quiz-battle/shared";
import { getApiOrigin } from "@/lib/apiOrigin";
import { useGameStore } from "@/store/gameStore";
import { AccountShell, AccountState } from "@/components/account/AccountShell";
import styles from "@/components/account/Account.module.css";

interface ActiveGame { gameId: string; mode: string; difficulty: string; status: GameStatus; playerCount: number; maxPlayers: number; currentRound: number; totalRounds: number; }
const modes: Record<string, [string, string]> = { classic: ["Classic", "كلاسيكي"], survival: ["Survival", "البقاء"], conquest: ["Conquest", "الغزو"], chaos: ["Chaos", "الفوضى"], custom: ["Custom", "مخصص"] };
const levels: Record<string, [string, string]> = { novice: ["Novice", "مبتدئ"], scholar: ["Scholar", "باحث"], sage: ["Sage", "حكيم"], master: ["Master", "خبير"], legend: ["Legend", "أسطورة"] };
const statuses: Record<string, [string, string]> = { lobby: ["Waiting to start", "بانتظار البدء"], countdown: ["Starting", "تبدأ قريباً"], question: ["Live", "مباشر"], answer_reveal: ["Answer reveal", "كشف الإجابة"], powerup_select: ["Choosing powers", "اختيار القدرات"], results: ["Results", "النتائج"] };

export default function SpectatePage() {
  const router = useRouter();
  const language = useGameStore(state => state.language);
  const ar = language === "ar";
  const number = new Intl.NumberFormat(language);
  const [games, setGames] = useState<ActiveGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);
  const [updated, setUpdated] = useState<Date | null>(null);
  const [joining, setJoining] = useState<string | null>(null);
  const [guestFailed, setGuestFailed] = useState(false);
  const request = useRef<AbortController | null>(null);
  const joiningRef = useRef(false);
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (guestFailed) errorRef.current?.focus(); }, [guestFailed]);
  const fetchGames = useCallback(async () => {
    if (request.current) return;
    const controller = new AbortController(); request.current = controller;
    const timeout = setTimeout(() => controller.abort(), 20000);
    setRefreshing(true);
    try {
      const response = await fetch(`${getApiOrigin()}/api/games/active`, { signal: controller.signal, cache: "no-store" });
      if (!response.ok) throw new Error("List unavailable");
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error("Invalid list");
      if (request.current === controller) { setGames(data); setUpdated(new Date()); setFailed(false); }
    } catch { if (request.current === controller) setFailed(true); }
    finally { clearTimeout(timeout); if (request.current === controller) { request.current = null; setRefreshing(false); setLoading(false); } }
  }, []);
  useEffect(() => {
    void fetchGames();
    const interval = setInterval(() => void fetchGames(), 10000);
    return () => { clearInterval(interval); request.current?.abort(); request.current = null; };
  }, [fetchGames]);
  async function spectate(gameId: string) {
    if (joiningRef.current) return;
    joiningRef.current = true; setJoining(gameId); setGuestFailed(false);
    try {
      const store = useGameStore.getState();
      if (!store.userId || !store.token) {
        const response = await fetch(`${getApiOrigin()}/api/auth/guest`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
        if (!response.ok) throw new Error("Guest unavailable");
        const guest = await response.json();
        if (typeof guest.userId !== "string" || typeof guest.token !== "string") throw new Error("Invalid identity");
        store.setAuth({ ...guest, isGuest: true });
      }
      router.push(`/lobby/${gameId}?spectate=true`);
    } catch { setGuestFailed(true); }
    finally { joiningRef.current = false; setJoining(null); }
  }
  const visible = games.filter(game => game.status !== GameStatus.Ended);
  const sections = [[ar ? "معارك جارية" : "In progress", visible.filter(game => game.status !== GameStatus.Lobby)], [ar ? "بانتظار البدء" : "Waiting to start", visible.filter(game => game.status === GameStatus.Lobby)]] as const;
  return <AccountShell title={ar ? "شاهد المعارك المباشرة" : "Watch Live Matches"}
    description={ar ? "تابع التحديات من مقعد المتفرج. المشاهدة لا تضيفك إلى قائمة اللاعبين." : "Follow the action from the spectator seat. Watching does not add you to the player roster."}>
    <div className={styles.sectionHeader} style={{ marginTop: 0 }}><p className={styles.muted}>{updated ? <>{ar ? "آخر تحديث" : "Last updated"} <time dateTime={updated.toISOString()}>{updated.toLocaleTimeString(language)}</time></> : (ar ? "يتم تحديث القائمة كل ١٠ ثوانٍ." : "The list refreshes every 10 seconds.")}</p>
      <button className={styles.secondary} onClick={() => void fetchGames()} disabled={loading || refreshing}>{refreshing ? (ar ? "جارٍ التحديث…" : "Refreshing…") : (ar ? "تحديث المعارك" : "Refresh matches")}</button>
    </div>
    {failed && <AccountState error title={ar ? "تعذر تحديث المعارك" : "Could not refresh matches"}><p>{ar ? "تحقق من اتصالك وحاول مجدداً. قد تكون القائمة المعروضة قديمة." : "Check your connection and try again. The displayed list may be out of date."}</p></AccountState>}
    {guestFailed && <div ref={errorRef} tabIndex={-1} role="alert" className={styles.error}>{ar ? "تعذر الدخول كضيف. حاول اختيار المعركة مجدداً." : "Could not sign in as a guest. Select the match to try again."}</div>}
    {loading ? <AccountState loading title={ar ? "جارٍ البحث عن المعارك…" : "Finding live matches…"} />
      : !visible.length && !failed ? <AccountState title={ar ? "الساحة هادئة الآن" : "The arena is quiet"}><p>{ar ? "لا توجد معارك نشطة حالياً. ابدأ معركتك، أو عد لاحقاً للمشاهدة." : "There are no active matches right now. Start your own battle, or return later to watch."}</p><div className={styles.actions}><Link href="/" className={styles.primary}>{ar ? "ابدأ معركة" : "Start a battle"}</Link></div></AccountState>
      : sections.map(([heading, list]) => list.length > 0 && <section key={heading} aria-label={heading}><div className={styles.sectionHeader}><h2>{heading} <bdi>({number.format(list.length)})</bdi></h2></div><div className={styles.matchGrid}>
        {list.map(game => <article className={`${styles.panel} ${styles.matchCard}`} key={game.gameId}>
          <header className={styles.matchHeader}><h3>{modes[game.mode]?.[ar ? 1 : 0] ?? game.mode}</h3><span className={styles.badge}>{statuses[game.status]?.[ar ? 1 : 0] ?? (ar ? "معركة" : "Match")}</span></header>
          <dl className={styles.matchFacts}><div><dt>{ar ? "اللاعبون" : "Players"}</dt><dd><bdi>{number.format(game.playerCount)} / {number.format(game.maxPlayers)}</bdi></dd></div><div><dt>{ar ? "الجولة" : "Round"}</dt><dd>{game.currentRound > 0 ? <bdi>{number.format(game.currentRound)} / {number.format(game.totalRounds)}</bdi> : game.mode === "conquest" && game.status !== GameStatus.Lobby ? (ar ? "توزيع الأقاليم" : "Territory draft") : (ar ? "لم تبدأ" : "Not started")}</dd></div><div><dt>{ar ? "الصعوبة" : "Difficulty"}</dt><dd>{levels[game.difficulty]?.[ar ? 1 : 0] ?? game.difficulty}</dd></div></dl>
          <button className={styles.secondary} style={{ width: "100%" }} onClick={() => void spectate(game.gameId)} disabled={joining !== null} aria-label={`${ar ? "مشاهدة" : "Watch"} ${modes[game.mode]?.[ar ? 1 : 0] ?? game.mode}`}>
            {joining === game.gameId ? (ar ? "جارٍ الدخول…" : "Joining…") : (ar ? "مشاهدة المعركة" : "Watch match")}
          </button>
        </article>)}
      </div></section>)}
  </AccountShell>;
}

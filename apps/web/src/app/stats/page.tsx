"use client";

import Link from "next/link";
import { GameMode } from "@quiz-battle/shared";
import { useGameStore } from "@/store/gameStore";
import { usePlayerStats } from "@/hooks/usePlayerStats";
import { AccountShell, AccountState } from "@/components/account/AccountShell";
import styles from "@/components/account/Account.module.css";

const modes: Record<string, [string, string]> = { classic: ["Classic", "كلاسيكي"], survival: ["Survival", "البقاء"], conquest: ["Conquest", "الغزو"], chaos: ["Chaos", "الفوضى"], custom: ["Custom", "مخصص"] };
export default function StatsPage() {
  const { language, username } = useGameStore();
  const { ready, signedIn, stats, failed, needsSignIn, retry } = usePlayerStats();
  const ar = language === "ar";
  const number = new Intl.NumberFormat(language);
  const date = new Intl.DateTimeFormat(language, { dateStyle: "medium" });
  return <AccountShell title={ar ? "إحصائيات اللاعب" : "Player statistics"} active="stats">
    {ready && !signedIn ? <AccountState title={ar ? "ابدأ قصتك في المعركة" : "Start your arena story"}>
      <p>{ar ? "ادخل اللعبة لعرض إحصائياتك." : "Enter the game to see your statistics."}</p><div className={styles.actions}><Link href="/" className={styles.primary}>{ar ? "العب الآن" : "Play now"}</Link><Link href="/login" className={styles.secondary}>{ar ? "تسجيل الدخول" : "Sign in"}</Link></div>
    </AccountState> : failed ? <AccountState error title={needsSignIn ? (ar ? "سجّل الدخول مجدداً" : "Sign in again") : (ar ? "تعذر تحميل الإحصائيات" : "Statistics could not be loaded")}>
      <p>{needsSignIn ? (ar ? "انتهت صلاحية جلستك. سجّل الدخول لعرض نتائجك." : "Your session has expired. Sign in to view your results.") : (ar ? "حاول مجدداً. ستبقى نتائجك المحفوظة متاحة عند استعادة الاتصال." : "Try again. Your saved results will be available when your connection returns.")}</p>
      <div className={styles.actions}>{needsSignIn ? <Link href="/login" className={styles.primary}>{ar ? "تسجيل الدخول" : "Sign in"}</Link> : <button className={styles.secondary} onClick={retry}>{ar ? "أعد المحاولة" : "Retry"}</button>}</div>
    </AccountState> : !stats ? <AccountState loading title={ar ? "جارٍ تحميل الإحصائيات…" : "Loading statistics…"} /> : <div className={styles.stack}>
      <section className={styles.panel} aria-labelledby="performance-heading"><div className={styles.sectionHeader} style={{ marginTop: 0 }}><h2 id="performance-heading"><bdi>{username}</bdi></h2><span className={styles.badge}>{ar ? "المعارك المكتملة فقط" : "Completed matches only"}</span></div>
        <dl className={styles.metrics}>{[
          [ar ? "المعارك المكتملة" : "Completed battles", number.format(stats.totalGames)],
          [ar ? "الانتصارات" : "Wins", number.format(stats.wins)],
          [ar ? "الإجابات المُرسلة" : "Answers submitted", number.format(stats.totalAnswers)],
          [ar ? "دقة الإجابة" : "Answer accuracy", stats.totalAnswers ? new Intl.NumberFormat(language, { style: "percent" }).format(stats.correctAnswers / stats.totalAnswers) : "—"],
        ].map(([label, value]) => <div key={label} className={styles.metric}><dt>{label}</dt><dd><bdi>{value}</bdi></dd></div>)}</dl>
      </section>
      <section className={styles.panel} aria-labelledby="recent-heading"><div className={styles.sectionHeader} style={{ marginTop: 0 }}><h2 id="recent-heading">{ar ? "أحدث المعارك" : "Recent battles"}</h2><Link href="/" className={styles.primary}>{ar ? "ابدأ معركة" : "Start a battle"}</Link></div>
        {!stats.history.length ? <p className={styles.muted}>{ar ? "ستظهر نتائجك هنا بعد إكمال أول معركة." : "Finish your first battle to see your results here."}</p>
          : <ul className={styles.history}>{stats.history.map(game => <li key={game.id}><Link href={`/results/${encodeURIComponent(game.id)}`}>
            <div><strong>{modes[game.mode]?.[ar ? 1 : 0] ?? game.mode}</strong><time dateTime={game.endedAt}>{Number.isFinite(new Date(game.endedAt).getTime()) ? date.format(new Date(game.endedAt)) : "—"}</time></div>
            <div>{ar ? "المركز" : "Rank"} <bdi>{number.format(game.rank)} / {number.format(game.playerCount)}</bdi><small>{ar ? "عرض النتيجة" : "View result"} <span aria-hidden="true">{ar ? "←" : "→"}</span></small></div>
            <div className={styles.historyScore}><bdi>{number.format(game.score)}</bdi><small>{game.mode === GameMode.Conquest ? (ar ? "أقاليم" : "territories") : (ar ? "نقطة" : "points")}</small></div>
          </Link></li>)}</ul>}
      </section>
    </div>}
  </AccountShell>;
}

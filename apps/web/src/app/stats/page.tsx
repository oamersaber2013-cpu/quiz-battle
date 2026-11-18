"use client";

import Link from "next/link";
import { useGameStore } from "@/store/gameStore";
import { useDocumentLocale } from "@/hooks/useDocumentLocale";
import { usePlayerStats } from "@/hooks/usePlayerStats";

const modes: Record<string, [string, string]> = {
  classic: ["Classic", "كلاسيكي"], survival: ["Survival", "البقاء"], conquest: ["Conquest", "الغزو"],
  chaos: ["Chaos", "الفوضى"], custom: ["Custom", "مخصص"],
};

export default function StatsPage() {
  const language = useGameStore(state => state.language);
  const username = useGameStore(state => state.username);
  const { ready, signedIn, stats, failed, retry } = usePlayerStats();
  useDocumentLocale(language);
  const ar = language === "ar";
  const number = new Intl.NumberFormat(language);
  const date = new Intl.DateTimeFormat(language, { dateStyle: "medium" });
  return (
    <main className="page" dir={ar ? "rtl" : "ltr"} style={{ padding: "24px 16px" }}>
      <div style={{ width: "100%", maxWidth: 820, margin: "0 auto", display: "grid", gap: 20 }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <h1>{ar ? "إحصائيات اللاعب" : "Player statistics"}</h1>
          <Link className="btn btn-secondary" href="/">{ar ? "الرئيسية" : "Home"}</Link>
        </header>
        {ready && !signedIn ? <p>{ar ? "ادخل اللعبة لعرض إحصائياتك." : "Enter the game to see your statistics."}</p>
          : failed ? <div role="alert">{ar ? "تعذر تحميل الإحصائيات." : "Statistics could not be loaded."} <button className="btn btn-secondary" onClick={retry}>{ar ? "أعد المحاولة" : "Retry"}</button></div>
          : !stats ? <p role="status">{ar ? "جارٍ تحميل الإحصائيات…" : "Loading statistics…"}</p>
          : <>
            <h2>{username}</h2>
            <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(135px, 1fr))", gap: 12 }}>
              {[
                [ar ? "المعارك المكتملة" : "Completed battles", number.format(stats.totalGames)],
                [ar ? "الانتصارات" : "Wins", number.format(stats.wins)],
                [ar ? "مجموع النقاط" : "Total score", number.format(stats.totalScore)],
                [ar ? "دقة الإجابة" : "Answer accuracy", stats.totalAnswers ? new Intl.NumberFormat(language, { style: "percent" }).format(stats.correctAnswers / stats.totalAnswers) : "—"],
              ].map(([label, value]) => <div className="glass-card p-4" key={label}><dt>{label}</dt><dd style={{ margin: 0, fontWeight: 750, fontSize: "1.4rem" }}>{value}</dd></div>)}
            </dl>
            <section className="glass-card p-4">
              <h2>{ar ? "أحدث المعارك" : "Recent battles"}</h2>
              {stats.history.length === 0 && <p>{ar ? "ستظهر نتائجك هنا بعد إكمال أول معركة." : "Finish your first battle to see your results here."}</p>}
              <ul style={{ listStyle: "none", padding: 0 }}>
                {stats.history.map(game => <li key={game.id} style={{ paddingBlock: 12, borderBottom: "1px solid var(--clr-border)" }}>
                  <Link href={`/results/${game.id}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", color: "inherit" }}>
                    <strong>{modes[game.mode]?.[ar ? 1 : 0] ?? game.mode}</strong>
                    <time dateTime={game.endedAt}>{date.format(new Date(game.endedAt))}</time>
                    <span>{ar ? "المركز" : "Rank"} <bdi>{number.format(game.rank)} / {number.format(game.playerCount)}</bdi></span>
                    <span>{number.format(game.score)} {ar ? "نقطة" : "points"}</span>
                  </Link>
                </li>)}
              </ul>
            </section>
          </>}
      </div>
    </main>
  );
}

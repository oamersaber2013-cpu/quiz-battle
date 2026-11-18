"use client";
import { getApiOrigin } from "@/lib/apiOrigin";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useGameStore } from "@/store/gameStore";
import { GameMode, type SavedGameResults } from "@quiz-battle/shared";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useDocumentLocale } from "@/hooks/useDocumentLocale";
import { BattleHeader, MODE_NAMES } from "@/components/BattleHeader";
import styles from "@/components/ActiveExperience.module.css";
import resultStyles from "./Results.module.css";

const T = {
  victory: { en: "Victory!", ar: "انتصار!" },
  battleOver: { en: "Battle Over!", ar: "انتهت المعركة!" },
  youConquered: { en: "You conquered the knowledge arena!", ar: "لقد سيطرت على ساحة المعرفة!" },
  claimedVictory: { en: "claimed victory!", ar: "حقق النصر!" },
  yourRank: { en: "Your Rank", ar: "ترتيبك" },
  score: { en: "Score", ar: "النقاط" },
  correct: { en: "Correct", ar: "صحيحة" },
  avgSpeed: { en: "Average answer time", ar: "متوسط زمن الإجابة" },
  finalStandings: { en: "Final Standings", ar: "الترتيب النهائي" },
  playAgain: { en: "Play Again", ar: "العب مجدداً" },
  home: { en: "Home", ar: "الرئيسية" },
  you: { en: "(you)", ar: "(أنت)" },
  pts: { en: "pts", ar: "نقطة" },
  shareResult: { en: "Share Result", ar: "شارك النتيجة" },
  copied: { en: "Copied!", ar: "تم النسخ!" },
  copying: { en: "Copying…", ar: "جارٍ النسخ…" },
  copyFailed: { en: "Could not copy your result. Try again.", ar: "تعذر نسخ نتيجتك. حاول مجدداً." },
  statistics: { en: "My statistics", ar: "إحصائياتي" },
  tiedScore: { en: "Equal score", ar: "رصيد متساوٍ" },
  accuracy: { en: "Accuracy", ar: "الدقة" },
  mode: { en: "Mode", ar: "الوضع" },
  territories: { en: "Territories", ar: "الأقاليم" },
};

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;
  const { userId, token, resetGame, setLanguage, language: preferredLanguage } = useGameStore();
  const [shareState, setShareState] = useState<"idle" | "copying" | "copied" | "failed">("idle");
  const [hydrated, setHydrated] = useState(false);
  const [retry, setRetry] = useState(0);
  const [resource, setResource] = useState<{ identity: string; data?: SavedGameResults; errorStatus?: number } | null>(null);
  const identity = `${gameId}:${userId || ""}:${token || ""}`;
  const currentResource = resource?.identity === identity ? resource : null;
  const saved = currentResource?.data;
  // Keep persisted placements intact, including the recorded order of equal scores.
  const finalResults = [...(saved?.results || [])].sort((a, b) => a.rank - b.rank);
  const language = saved?.language || preferredLanguage;
  useDocumentLocale(language);
  const mode = saved?.mode;
  const isConquest = mode === GameMode.Conquest;

  useEffect(() => setHydrated(true), []);
  useEffect(() => setShareState("idle"), [identity]);
  useEffect(() => {
    if (!hydrated) return;
    if (!userId || !token) {
      setResource({ identity, errorStatus: 401 });
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
      setResource({ identity, errorStatus: 503 });
    }, 20000);
    setResource(null);
    const API = getApiOrigin();
    async function loadResults() {
      try {
        const response = await fetch(`${API}/api/results/${encodeURIComponent(gameId)}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          if (!controller.signal.aborted) setResource({ identity, errorStatus: response.status });
          return;
        }
        const data: SavedGameResults = await response.json();
        if (data.gameId !== gameId || !Array.isArray(data.results) || data.results.length === 0) throw new Error("Invalid result response");
        if (!controller.signal.aborted) setResource({ identity, data });
      } catch {
        if (!controller.signal.aborted) setResource({ identity, errorStatus: 503 });
      } finally {
        clearTimeout(timeout);
      }
    }
    void loadResults();
    return () => { clearTimeout(timeout); controller.abort(); };
  }, [gameId, userId, token, hydrated, retry, identity]);

  const myResult = finalResults.find((r) => r.userId === userId);
  const themeClass = mode ? `theme-${mode.toLowerCase()}` : "";
  const isRTL = language === "ar";
  const isWinner = myResult?.rank === 1;
  const number = new Intl.NumberFormat(language);
  const seconds = new Intl.NumberFormat(language, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const scoreCounts = new Map<number, number>();
  finalResults.forEach(result => scoreCounts.set(result.score, (scoreCounts.get(result.score) || 0) + 1));
  const highestScore = finalResults.length ? Math.max(...finalResults.map(result => result.score)) : 0;
  const topScoreCount = scoreCounts.get(highestScore) || 0;
  const topScoreTied = topScoreCount > 1;

  function handlePlayAgain() {
    setLanguage(language);
    resetGame();
    router.push("/");
  }

  async function handleShare() {
    if (!myResult || shareState === "copying") return;
    const text = isRTL
      ? `حصلت على المركز ${number.format(myResult.rank)} برصيد ${number.format(myResult.score)} ${isConquest ? "من الأقاليم" : "نقطة"} في سيف المعرفة!`
      : `I ranked #${number.format(myResult.rank)} with ${number.format(myResult.score)} ${isConquest ? "territories" : "points"} in Sword of Knowledge!`;
    setShareState("copying");
    try {
      await navigator.clipboard.writeText(text);
      setShareState("copied");
    } catch {
      setShareState("failed");
    }
  }

  if (!hydrated || !currentResource) {
    return <main id="main-content" aria-busy="true" className={styles.page} dir={isRTL ? "rtl" : "ltr"} style={{ minHeight: "100dvh", display: "flex", justifyContent: "center", alignItems: "center" }}>
      <LoadingSpinner size="lg" message={isRTL ? "جاري تحميل النتائج المحفوظة..." : "Loading saved results..."} />
    </main>;
  }

  if (!saved) {
    const status = currentResource.errorStatus;
    const message = status === 401
      ? (isRTL ? "سجّل الدخول بالحساب الذي استخدمته في هذه المعركة لعرض النتائج." : "Sign in with the account you used in this battle to view its results.")
      : status === 403
        ? (isRTL ? "نتائج هذه المعركة متاحة للمشاركين والمضيف فقط." : "These results are available only to the battle participants and host.")
        : status === 404
          ? (isRTL ? "لا توجد نتائج محفوظة لهذه المعركة بعد." : "Saved results are not available for this battle yet.")
          : (isRTL ? "تعذر تحميل النتائج الآن. قد يكون حفظها قيد التنفيذ. حاول مرة أخرى بعد قليل." : "Results cannot be loaded right now. They may still be saving. Please retry shortly.");
    return <main id="main-content" className={styles.page} dir={isRTL ? "rtl" : "ltr"}>
      <div className={styles.frame}>
        <BattleHeader language={language} stage="results" />
        <section className={`${styles.surface} ${resultStyles.errorState}`} aria-labelledby="battle-result-title">
        <h1 id="battle-result-title" className={styles.heading}>{isRTL ? "نتائج المعركة" : "Battle results"}</h1>
        <p role="alert" className={styles.lede}>{message}</p>
        <div className={styles.resultActions}>
          {status !== 401 && status !== 403 && <button type="button" className="btn btn-primary" onClick={() => setRetry((value) => value + 1)}>{isRTL ? "حاول مرة أخرى" : "Retry"}</button>}
          {status === 401 && <Link className="btn btn-primary" href="/login">{isRTL ? "تسجيل الدخول" : "Sign in"}</Link>}
          <Link className="btn btn-secondary" href="/">{T.home[language]}</Link>
        </div>
        </section>
      </div>
    </main>;
  }

  const winner = finalResults.find(result => result.rank === 1);
  const accuracy = myResult && myResult.totalAnswers > 0
    ? new Intl.NumberFormat(language, { style: "percent", maximumFractionDigits: 0 }).format(myResult.correctAnswers / myResult.totalAnswers)
    : "—";

  return (
    <main id="main-content" className={`${styles.page} ${themeClass}`} dir={isRTL ? "rtl" : "ltr"}>
      <div className={styles.frame}>
        <BattleHeader language={language} stage="results" />
        <div className={styles.resultsLayout}>
          <section className={styles.surface} aria-labelledby="battle-result-title">
            <div className={styles.winnerMark} aria-hidden="true">{isWinner ? "♛" : "⚔"}</div>
            <p className={styles.eyebrow}>{mode ? MODE_NAMES[mode]?.[language] || mode : T.mode[language]}</p>
            <h1 id="battle-result-title" className={styles.heading}>{topScoreTied ? (isRTL ? "تعادل في أعلى رصيد" : "Top score tied") : isWinner ? T.victory[language] : T.battleOver[language]}</h1>
            <p className={styles.lede}>{topScoreTied
              ? (isRTL ? `تعادل ${number.format(topScoreCount)} من اللاعبين في أعلى رصيد. يُعرض الترتيب المحفوظ أدناه.` : `${number.format(topScoreCount)} players share the top score. Recorded placements are shown below.`)
              : isWinner ? T.youConquered[language] : winner ? <><bdi>{winner.username}</bdi> {T.claimedVictory[language]}</> : null}</p>
            {myResult && <dl className={`${styles.metrics} ${resultStyles.metrics}`}>
              <div className={styles.metric}><dt>{T.yourRank[language]}</dt><dd><bdi>#{number.format(myResult.rank)}</bdi></dd></div>
              <div className={styles.metric}><dt>{isConquest ? T.territories[language] : T.score[language]}</dt><dd><bdi>{number.format(myResult.score)}</bdi></dd></div>
              <div className={styles.metric}><dt>{T.accuracy[language]}</dt><dd><bdi>{accuracy}</bdi></dd></div>
              <div className={styles.metric}><dt>{T.avgSpeed[language]}</dt><dd>{myResult.totalAnswers > 0 ? <><bdi>{seconds.format(myResult.avgAnswerTime / 1000)}</bdi> {isRTL ? "ث" : "s"}</> : "—"}</dd></div>
            </dl>}
            <div className={styles.resultActions}>
              <button type="button" className="btn btn-primary" onClick={handlePlayAgain}>{T.playAgain[language]}</button>
              <Link className="btn btn-secondary" href="/stats" onClick={() => setLanguage(language)}>{T.statistics[language]}</Link>
              {myResult && <button type="button" className="btn btn-ghost" onClick={handleShare} disabled={shareState === "copying"}>{shareState === "copying" ? T.copying[language] : T.shareResult[language]}</button>}
            </div>
            <p role="status" className={resultStyles.shareFeedback}>{shareState === "copied" ? T.copied[language] : shareState === "failed" ? T.copyFailed[language] : ""}</p>
          </section>
          <section aria-labelledby="final-standings">
            <h2 className={styles.sectionHeading} id="final-standings">{T.finalStandings[language]} <small>{number.format(finalResults.length)} {isRTL ? "من اللاعبين" : finalResults.length === 1 ? "player" : "players"}</small></h2>
            <ol className={styles.standings}>
              {finalResults.map(result => <li className={styles.standing} key={result.userId}>
                <span className={styles.rank} aria-label={`${isRTL ? "المركز" : "Rank"} ${number.format(result.rank)}`}>{number.format(result.rank)}</span>
                <span className={styles.avatar} aria-hidden="true">{result.username.charAt(0).toUpperCase()}</span>
                <div className={styles.playerName}><strong><bdi>{result.username}</bdi>{result.userId === userId && <small>{T.you[language]}</small>}</strong>
                  {(scoreCounts.get(result.score) || 0) > 1 && <small>{T.tiedScore[language]}</small>}
                  {result.totalAnswers > 0 && <small><bdi>{number.format(result.correctAnswers)}/{number.format(result.totalAnswers)}</bdi> {isRTL ? "إجابة صحيحة" : "correct"} · <bdi>{seconds.format(result.avgAnswerTime / 1000)}</bdi> {isRTL ? "ث" : "s"}</small>}
                </div>
                <div className={styles.standingScore}><strong>{result.score.toLocaleString(language)}</strong><small>{isConquest ? T.territories[language] : T.pts[language]}</small></div>
              </li>)}
            </ol>
          </section>
        </div>
      </div>
    </main>
  );
}

"use client";
import { getApiOrigin } from "@/lib/apiOrigin";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useGameStore } from "@/store/gameStore";
import { GameMode, type SavedGameResults } from "@quiz-battle/shared";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useDocumentLocale } from "@/hooks/useDocumentLocale";
import { BattleHeader, MODE_NAMES } from "@/components/BattleHeader";
import styles from "@/components/ActiveExperience.module.css";

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
  territories: { en: "Territories", ar: "الأقاليم" },
};

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;
  const { userId, token, resetGame, language: preferredLanguage } = useGameStore();
  const [shareCopied, setShareCopied] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [retry, setRetry] = useState(0);
  const [resource, setResource] = useState<{ identity: string; data?: SavedGameResults; errorStatus?: number } | null>(null);
  const identity = `${gameId}:${userId || ""}:${token || ""}`;
  const currentResource = resource?.identity === identity ? resource : null;
  const saved = currentResource?.data;
  const finalResults = saved?.results || [];
  const language = saved?.language || preferredLanguage;
  useDocumentLocale(language);
  const mode = saved?.mode;
  const isConquest = mode === GameMode.Conquest;

  useEffect(() => setHydrated(true), []);
  useEffect(() => {
    if (!hydrated) return;
    if (!userId || !token) {
      setResource({ identity, errorStatus: 401 });
      return;
    }
    const controller = new AbortController();
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
      }
    }
    void loadResults();
    return () => controller.abort();
  }, [gameId, userId, token, hydrated, retry, identity]);

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
      ? `حصلت على المرتبة #${myResult.rank} بـ ${myResult.score.toLocaleString()} ${isConquest ? "إقليم" : "نقطة"} في Quiz Battle! 🏆`
      : `I ranked #${myResult.rank} with ${myResult.score.toLocaleString()} ${isConquest ? "territories" : "points"} in Quiz Battle! 🏆`;
    navigator.clipboard.writeText(text);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  }

  if (!hydrated || !currentResource) {
    return <main className={styles.page} dir={isRTL ? "rtl" : "ltr"} style={{ minHeight: "100dvh", display: "flex", justifyContent: "center", alignItems: "center" }}>
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
    return <main className={styles.page} dir={isRTL ? "rtl" : "ltr"} style={{ padding: 24 }}>
      <div className="glass-card p-6" style={{ maxWidth: 600, margin: "40px auto" }}>
        <h1 className="text-xl font-bold mb-3">{isRTL ? "نتائج المعركة" : "Battle results"}</h1>
        <p role="alert" className="mb-4">{message}</p>
        <div style={{ display: "flex", gap: 12 }}>
          <button className="btn btn-primary" onClick={() => setRetry((value) => value + 1)}>{isRTL ? "حاول مرة أخرى" : "Retry"}</button>
          {status === 401 && <button className="btn btn-secondary" onClick={() => router.push("/login")}>{isRTL ? "تسجيل الدخول" : "Sign in"}</button>}
          <button className="btn btn-secondary" onClick={() => router.push("/")}>{T.home[language]}</button>
        </div>
      </div>
    </main>;
  }

  const winner = finalResults[0];
  const accuracy = myResult
    ? Math.round((myResult.correctAnswers / Math.max(myResult.totalAnswers, 1)) * 100)
    : 0;

  return (
    <main className={`${styles.page} ${themeClass}`} dir={isRTL ? "rtl" : "ltr"}>
      <div className={styles.frame}>
        <BattleHeader language={language} stage="results" />
        <div className={styles.resultsLayout}>
          <section className={styles.surface} aria-labelledby="battle-result-title">
            <div className={styles.winnerMark} aria-hidden="true">{isWinner ? "♛" : "⚔"}</div>
            <p className={styles.eyebrow}>{mode ? MODE_NAMES[mode]?.[language] || mode : T.mode[language]}</p>
            <h1 id="battle-result-title" className={styles.heading}>{winner.userId === userId ? T.victory[language] : T.battleOver[language]}</h1>
            <p className={styles.lede}>{winner.userId === userId ? T.youConquered[language] : <><bdi>{winner.username}</bdi> {T.claimedVictory[language]}</>}</p>
            {myResult && <div className={styles.metrics}>
              <div className={styles.metric}><strong>#{myResult.rank}</strong><span>{T.yourRank[language]}</span></div>
              <div className={styles.metric}><strong>{myResult.score.toLocaleString(language)}</strong><span>{isConquest ? T.territories[language] : T.score[language]}</span></div>
              {!isConquest && <>
                <div className={styles.metric}><strong>{accuracy}%</strong><span>{T.accuracy[language]}</span></div>
                <div className={styles.metric}><strong>{(myResult.avgAnswerTime / 1000).toFixed(1)} {isRTL ? "ث" : "s"}</strong><span>{T.avgSpeed[language]}</span></div>
              </>}
            </div>}
            <div className={styles.resultActions}>
              <button type="button" className="btn btn-primary" onClick={handlePlayAgain}>{T.playAgain[language]}</button>
              {myResult && <button type="button" className="btn btn-secondary" onClick={handleShare}>{shareCopied ? `✓ ${T.copied[language]}` : T.shareResult[language]}</button>}
              <button type="button" className="btn btn-ghost" onClick={() => router.push("/")}>{T.home[language]}</button>
            </div>
          </section>
          <section aria-labelledby="final-standings">
            <h2 className={styles.sectionHeading} id="final-standings">{T.finalStandings[language]} <small>{finalResults.length} {isRTL ? "لاعبين" : "players"}</small></h2>
            <ol className={styles.standings}>
              {finalResults.map(result => <li className={styles.standing} key={result.userId}>
                <span className={styles.rank} aria-label={`${isRTL ? "المركز" : "Rank"} ${result.rank}`}>{result.rank}</span>
                <span className={styles.avatar} aria-hidden="true">{result.username.charAt(0).toUpperCase()}</span>
                <div className={styles.playerName}><strong><bdi>{result.username}</bdi>{result.userId === userId && <small>{T.you[language]}</small>}</strong>
                  {!isConquest && <small><bdi>{result.correctAnswers}/{result.totalAnswers}</bdi> {isRTL ? "إجابة صحيحة" : "correct"} · <bdi>{(result.avgAnswerTime / 1000).toFixed(1)}</bdi> {isRTL ? "ث" : "s"}</small>}
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

import Link from "next/link";
import styles from "./ActiveExperience.module.css";

export const MODE_NAMES: Record<string, { en: string; ar: string }> = {
  classic: { en: "Classic", ar: "كلاسيكي" }, survival: { en: "Survival", ar: "البقاء" },
  conquest: { en: "Conquest", ar: "الغزو" }, chaos: { en: "Chaos", ar: "الفوضى" }, custom: { en: "Custom", ar: "مخصص" },
};
export const DIFFICULTY_NAMES: Record<string, { en: string; ar: string }> = {
  novice: { en: "Novice", ar: "مبتدئ" }, scholar: { en: "Scholar", ar: "عالم" }, sage: { en: "Sage", ar: "حكيم" },
  master: { en: "Master", ar: "خبير" }, legend: { en: "Legend", ar: "أسطورة" },
};

export function BattleHeader({ language, stage }: { language: "en" | "ar"; stage: "lobby" | "play" | "results" }) {
  const ar = language === "ar";
  return <header className={styles.masthead}>
    <Link href="/" className={styles.brand} aria-label={ar ? "سيف المعرفة، الرئيسية" : "Sword of Knowledge, home"}>
      <img src="/icon-192.svg" width="34" height="34" alt="" />
      <span>{ar ? "سيف المعرفة" : "Sword of Knowledge"}</span>
    </Link>
    <nav className={styles.stageNav} aria-label={ar ? "مراحل المعركة" : "Battle progress"}>
      {([['lobby', 'Lobby', 'الانتظار'], ['play', 'Live match', 'المعركة'], ['results', 'Results', 'النتائج']] as const).map(([id, en, arabic], index) =>
        <span key={id} className={styles.stage} aria-current={stage === id ? "step" : undefined}>
          <span className={styles.stageNumber} aria-hidden="true">0{index + 1}</span>{ar ? arabic : en}
        </span>)}
    </nav>
  </header>;
}

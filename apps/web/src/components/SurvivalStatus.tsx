import type { PlayerState } from "@quiz-battle/shared";
import styles from "./ActiveExperience.module.css";

export function SurvivalStatus({ players, eliminated, shielded, spectating, language }: {
  players: PlayerState[];
  eliminated: boolean;
  shielded: boolean;
  spectating: boolean;
  language: "en" | "ar";
}) {
  const ar = language === "ar";
  const remaining = players.filter(player => !player.isEliminated).length;
  return <section className={styles.survivalStatus} data-eliminated={eliminated} aria-label={ar ? "حالة البقاء" : "Survival status"}>
    <div className={styles.survivalHeading}>
      <strong>{ar ? "البقاء" : "Survival"}</strong>
      <span>{new Intl.NumberFormat(language).format(remaining)} {ar ? "في المنافسة" : "still in"}</span>
    </div>
    <p role="status" aria-live="polite">{eliminated
      ? (ar ? "أُقصيت من المنافسة. يمكنك متابعة اللاعبين المتبقين." : "You are out of the competition. You can watch the remaining players.")
      : shielded && !spectating
        ? (ar ? "درعك يحميك من إقصاء واحد في هذه الجولة." : "Your shield protects you from one elimination this round.")
        : (ar ? "الإجابة الخاطئة أو تفويت السؤال يؤديان إلى الإقصاء. يفوز آخر لاعب باقٍ." : "A wrong or missed answer eliminates you. The last player standing wins.")}</p>
  </section>;
}

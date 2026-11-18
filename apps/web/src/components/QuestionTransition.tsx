"use client";
import { useEffect, useState } from "react";
import styles from "./ActiveExperience.module.css";

interface QuestionTransitionProps {
  round: number;
  totalRounds: number;
  language: "en" | "ar";
  onComplete: () => void;
}

const T = {
  round: { en: "Round", ar: "الجولة" },
  getReady: { en: "Get Ready!", ar: "استعد!" },
};

export function QuestionTransition({ round, totalRounds, language, onComplete }: QuestionTransitionProps) {
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (countdown <= 0) {
      const timeout = setTimeout(onComplete, 300);
      return () => clearTimeout(timeout);
    }

    const timer = setTimeout(() => {
      setCountdown(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, onComplete]);

  return (
    <div className={styles.transition} dir={language === "ar" ? "rtl" : "ltr"}>
      <div>
        <div className={styles.eyebrow}>
          {T.round[language]} {round} / {totalRounds}
        </div>
        <div className={styles.transitionCount} aria-hidden="true">
          {countdown > 0 ? countdown : "⚔"}
        </div>
        <p role="status">{T.getReady[language]}</p>
      </div>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";

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
      // Immediately complete when countdown reaches 0
      const timeout = setTimeout(onComplete, 300);
      return () => clearTimeout(timeout);
    }

    const timer = setTimeout(() => {
      setCountdown(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, onComplete]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(8, 9, 13, 0.95)",
        backdropFilter: "blur(10px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        animation: "fadeIn 0.3s ease",
      }}
    >
      <div style={{ textAlign: "center", animation: "scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)" }}>
        <div
          className="text-muted text-sm"
          style={{ marginBottom: 12, letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 700 }}
        >
          {T.round[language]} {round} / {totalRounds}
        </div>
        
        <div
          style={{
            fontSize: "clamp(4rem, 15vw, 8rem)",
            fontWeight: 900,
            background: countdown > 0 ? "var(--grad-primary)" : "transparent",
            WebkitBackgroundClip: countdown > 0 ? "text" : "unset",
            WebkitTextFillColor: countdown > 0 ? "transparent" : "unset",
            marginBottom: 24,
            animation: countdown > 0 ? "pulse 1s ease-in-out" : "none",
          }}
        >
          {countdown > 0 ? countdown : "⚔️"}
        </div>
        
        <div
          className="text-lg font-bold"
          style={{
            color: "var(--clr-primary)",
            animation: "float 2s ease-in-out infinite",
          }}
        >
          {T.getReady[language]}
        </div>
      </div>
    </div>
  );
}

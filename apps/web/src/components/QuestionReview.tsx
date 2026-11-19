"use client";

import { AnimatePresence } from "framer-motion";
import { useEffect, useId, useRef, type RefObject } from "react";
import { useGameStore } from "../store/gameStore";
import { ClientQuestion } from "@quiz-battle/shared";
import styles from "./QuestionReview.module.css";

interface QuestionReviewProps {
  question: ClientQuestion;
  correctIndex: number;
  explanation?: { en?: string; ar?: string };
  playerAnswers: Record<string, number>;
  isOpen: boolean;
  onClose: () => void;
  returnFocusRef?: RefObject<HTMLButtonElement>;
  shouldRestoreFocus?: () => boolean;
}

export function QuestionReview({
  question,
  correctIndex,
  explanation,
  playerAnswers,
  isOpen,
  onClose,
  returnFocusRef,
  shouldRestoreFocus,
}: QuestionReviewProps) {
  const { players, userId, language } = useGameStore();
  const isAr = language === "ar";
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const focusReturn = useRef({ returnFocusRef, shouldRestoreFocus });
  focusReturn.current = { returnFocusRef, shouldRestoreFocus };
  const text = (isAr ? question.textAr : question.textEn) || question.text;
  const options = (isAr ? question.optionsAr : question.optionsEn) || question.options;
  const knownPlayers = players.filter(player => Object.prototype.hasOwnProperty.call(playerAnswers, player.userId));

  useEffect(() => {
    if (!isOpen || typeof document === "undefined") return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body?.style.overflow;
    if (document.body) document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const controls = Array.from(dialogRef.current.querySelectorAll<HTMLElement>("button, a[href], input, [tabindex='0']"));
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (document.body) document.body.style.overflow = previousOverflow ?? "";
      const options = focusReturn.current;
      const target = options.returnFocusRef ? options.returnFocusRef.current : previousFocus;
      if ((options.shouldRestoreFocus?.() ?? true) && target?.isConnected && !target.matches(":disabled")) target.focus({ preventScroll: true });
    };
  }, [isOpen, onClose]);

  const currentUserAnswer = userId ? playerAnswers[userId] : undefined;
  const isCorrect = currentUserAnswer === correctIndex;

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className={styles.overlay}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={styles.dialog}
          >
            {/* Header */}
            <div className={styles.header}>
              <h2 id={titleId}>
                <span aria-hidden="true">
                  {currentUserAnswer === undefined ? "📖" : isCorrect ? "✅" : "❌"}
                </span>
                {isAr ? "مراجعة السؤال" : "Question Review"}
              </h2>
              <button
                ref={closeRef}
                type="button"
                aria-label={isAr ? "إغلاق مراجعة السؤال" : "Close question review"}
                onClick={onClose}
                className={styles.close}
              >
                <svg width="24" height="24" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Question */}
            <div className={styles.question}>
              <p>
                {text}
              </p>

              {/* Options */}
              <div className={styles.options}>
                {options.map((option, index) => {
                  const isCorrectOption = index === correctIndex;
                  const playerCount = Object.values(playerAnswers).filter((a) => a === index).length;

                  return (
                    <div
                      key={index}
                      className={styles.option}
                      data-correct={isCorrectOption}
                      data-selected={currentUserAnswer === index}
                    >
                      <span>
                        {option}
                        {isCorrectOption && (
                          <small>
                            {isAr ? "(الإجابة الصحيحة)" : "(Correct Answer)"}
                          </small>
                        )}
                      </span>

                      {/* Player count for this option */}
                      {playerCount > 0 && (
                        <span className={styles.answerCount}>
                          {playerCount} {isAr ? (playerCount === 1 ? "لاعب" : "لاعبين") : (playerCount === 1 ? "player" : "players")}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Explanation */}
            {explanation && (explanation.en || explanation.ar) && (
              <div className={styles.explanation}>
                <h3>
                  <span>💡</span>
                  {isAr ? "التفسير" : "Explanation"}
                </h3>
                <p>
                  {(isAr ? explanation.ar : explanation.en) || explanation.en || explanation.ar}
                </p>
              </div>
            )}

            {/* Player Answers Summary */}
            {knownPlayers.length > 0 && <div className={styles.playerAnswers}>
              <h3>
                {knownPlayers.length === 1 && knownPlayers[0].userId === userId
                  ? (isAr ? "إجابتك" : "Your answer") : (isAr ? "إجابات اللاعبين" : "Player Answers")}
              </h3>
              <div>
                {knownPlayers.map((player) => {
                  const answer = playerAnswers[player.userId];
                  const playerCorrect = answer === correctIndex;
                  const optionText = answer !== undefined && options
                    ? options[answer]
                    : isAr ? "لم يجب" : "No answer";

                  return (
                    <div
                      key={player.userId}
                      className={styles.playerAnswer}
                      data-correct={playerCorrect}
                    >
                      <span aria-hidden="true">
                        {playerCorrect ? "✓" : answer !== undefined ? "✗" : "−"}
                      </span>
                      <bdi>{player.username}</bdi>
                      <span>{optionText}</span>
                    </div>
                  );
                })}
              </div>
            </div>}

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className={styles.continue}
            >
              {isAr ? "متابعة" : "Continue"}
            </button>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default QuestionReview;

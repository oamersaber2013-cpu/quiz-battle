"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { GameStatus } from "@quiz-battle/shared";

interface FillBlankQuestionProps {
  question: any;
  status: GameStatus;
  timeLeft: number;
  selectedAnswer: number | null;
  lastAnswerResult: any;
  language: "en" | "ar";
  onAnswer: (answer: string) => void;
}

export function FillBlankQuestion({
  question,
  status,
  selectedAnswer,
  lastAnswerResult,
  language,
  onAnswer,
}: FillBlankQuestionProps) {
  const isAr = language === "ar";
  const [inputValue, setInputValue] = useState("");
  const hasAnswered = selectedAnswer !== null;
  const showResult = status === GameStatus.AnswerReveal || lastAnswerResult;

  const text = isAr ? question.textAr || question.text : question.textEn || question.text;
  const correctAnswer = question.correctAnswerText || question.correctAnswer;
  const acceptedAnswers = question.acceptedAnswers || [correctAnswer];

  // Split text by [BLANK] to show input in context
  const textParts = text.split(/\[BLANK\]|\[___\]|___/i);

  const handleSubmit = () => {
    if (!inputValue.trim() || hasAnswered) return;
    onAnswer(inputValue.trim());
  };

  const checkAnswer = (answer: string): boolean => {
    const normalized = answer.toLowerCase().trim();
    return acceptedAnswers.some((a: string) => a.toLowerCase().trim() === normalized);
  };

  const isCorrect = showResult && inputValue && checkAnswer(inputValue);
  const isWrong = showResult && inputValue && !checkAnswer(inputValue);

  // Handle Enter key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !hasAnswered && !showResult && inputValue.trim()) {
        handleSubmit();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [inputValue, hasAnswered, showResult]);

  return (
    <div className="w-full">
      {/* Question Text with Input */}
      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 mb-6">
        <div className="text-xl md:text-2xl font-bold text-white text-center leading-relaxed">
          {textParts.map((part: string, index: number) => (
            <span key={index}>
              {part}
              {index < textParts.length - 1 && (
                <span className="inline-block mx-2">
                  {!showResult ? (
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => !hasAnswered && setInputValue(e.target.value)}
                      disabled={hasAnswered || showResult}
                      placeholder={isAr ? "..." : "..."}
                      className={`w-32 md:w-48 px-3 py-2 text-center rounded-lg border-2 bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-colors ${
                        hasAnswered || showResult
                          ? "cursor-default"
                          : "border-gray-600"
                      }`}
                      autoFocus
                    />
                  ) : (
                    <span
                      className={`inline-block px-4 py-2 rounded-lg font-bold ${
                        isCorrect
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500"
                          : isWrong
                            ? "bg-rose-500/20 text-rose-400 border border-rose-500"
                            : "bg-gray-700 text-gray-400 border border-gray-600"
                      }`}
                    >
                      {inputValue || (isAr ? "?" : "?")}
                    </span>
                  )}
                </span>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Input Area (if not inline) */}
      {!showResult && textParts.length === 1 && (
        <div className="mb-6">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={hasAnswered}
            placeholder={isAr ? "اكتب إجابتك هنا..." : "Type your answer here..."}
            className="w-full px-4 py-4 text-lg rounded-2xl border-2 border-gray-700 bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 text-center transition-colors"
            autoFocus
          />
        </div>
      )}

      {/* Submit Button */}
      {!showResult && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={inputValue.trim() ? { scale: 1.02 } : {}}
          whileTap={inputValue.trim() ? { scale: 0.98 } : {}}
          disabled={!inputValue.trim() || hasAnswered}
          onClick={handleSubmit}
          className={`w-full p-4 rounded-2xl font-bold text-lg transition-all ${
            inputValue.trim()
              ? "bg-amber-500 text-white hover:bg-amber-600"
              : "bg-gray-700 text-gray-400 cursor-not-allowed"
          }`}
        >
          {isAr ? "تأكيد الإجابة" : "Submit Answer"}
        </motion.button>
      )}

      {/* Result Display */}
      {showResult && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`p-6 rounded-2xl border-2 text-center ${
            isCorrect
              ? "bg-emerald-500/10 border-emerald-500"
              : isWrong
                ? "bg-rose-500/10 border-rose-500"
                : "bg-gray-800 border-gray-700"
          }`}
        >
          {isCorrect ? (
            <>
              <div className="text-4xl mb-2">✓</div>
              <div className="text-emerald-400 font-bold text-xl">
                {isAr ? "إجابة صحيحة!" : "Correct Answer!"}
              </div>
            </>
          ) : isWrong ? (
            <>
              <div className="text-4xl mb-2">✗</div>
              <div className="text-rose-400 font-bold text-xl mb-2">
                {isAr ? "إجابة خاطئة" : "Wrong Answer"}
              </div>
              <div className="text-gray-400">
                {isAr ? "الإجابة الصحيحة:" : "Correct answer:"}{" "}
                <span className="text-emerald-400 font-bold">{correctAnswer}</span>
              </div>
              {acceptedAnswers.length > 1 && (
                <div className="text-sm text-gray-500 mt-2">
                  {isAr ? "أو:" : "Also accepted:"}{" "}
                  {acceptedAnswers.filter((a: string) => a !== correctAnswer).join(", ")}
                </div>
              )}
            </>
          ) : (
            <div className="text-gray-400">
              {isAr ? "لم يتم تقديم إجابة" : "No answer submitted"}
            </div>
          )}
        </motion.div>
      )}

      {/* Hint */}
      {!showResult && question.hint && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 5 }}
          className="mt-4 p-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-center"
        >
          <span className="text-sm text-gray-400">
            {isAr ? "تلميح: " : "Hint: "}
            {question.hint}
          </span>
        </motion.div>
      )}
    </div>
  );
}

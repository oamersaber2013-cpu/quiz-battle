"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { GameStatus, QuestionType } from "@quiz-battle/shared";

interface MultiSelectQuestionProps {
  question: any;
  status: GameStatus;
  timeLeft: number;
  selectedAnswer: number | null;
  lastAnswerResult: any;
  language: "en" | "ar";
  onSubmit: (selectedIndices: number[]) => void;
}

export function MultiSelectQuestion({
  question,
  status,
  selectedAnswer,
  lastAnswerResult,
  language,
  onSubmit,
}: MultiSelectQuestionProps) {
  const isAr = language === "ar";
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const hasAnswered = selectedAnswer !== null;
  const showResult = status === GameStatus.AnswerReveal || lastAnswerResult;

  const text = isAr ? question.textAr || question.text : question.textEn || question.text;
  const options = isAr
    ? question.optionsAr || question.options
    : question.optionsEn || question.options;

  const correctAnswers = question.correctAnswers || [question.correctAnswer];

  const toggleSelection = (index: number) => {
    if (hasAnswered || showResult) return;

    setSelectedIndices((prev) => {
      if (prev.includes(index)) {
        return prev.filter((i) => i !== index);
      }
      return [...prev, index];
    });
  };

  const handleSubmit = () => {
    if (selectedIndices.length === 0 || hasAnswered) return;
    // Submit the first selected index as the "answer" for game logic
    // The actual multiple selections are tracked in state
    onSubmit(selectedIndices);
  };

  return (
    <div className="w-full">
      {/* Question Text */}
      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 mb-4">
        <p className="text-xl md:text-2xl font-bold text-white text-center leading-relaxed">
          {text}
        </p>
        <p className="text-sm text-amber-400 text-center mt-2">
          {isAr ? "اختر جميع الإجابات الصحيحة" : "Select ALL correct answers"}
        </p>
      </div>

      {/* Selected Count */}
      {!showResult && (
        <div className="text-center mb-4">
          <span className="text-sm text-muted">
            {isAr
              ? `تم اختيار ${selectedIndices.length} ${selectedIndices.length === 1 ? "إجابة" : "إجابات"}`
              : `${selectedIndices.length} ${selectedIndices.length === 1 ? "answer" : "answers"} selected`}
          </span>
        </div>
      )}

      {/* Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {(options || []).map((option: string, index: number) => {
          const isSelected = selectedIndices.includes(index);
          const isCorrect = correctAnswers.includes(index);

          let borderColor = "border-gray-700";
          let bgColor = "bg-gray-800";
          let textColor = "text-white";

          if (showResult) {
            if (isCorrect) {
              borderColor = "border-emerald-500";
              bgColor = "bg-emerald-500/20";
              textColor = "text-emerald-400";
            } else if (isSelected && !isCorrect) {
              borderColor = "border-rose-500";
              bgColor = "bg-rose-500/20";
              textColor = "text-rose-400";
            }
          } else if (isSelected) {
            borderColor = "border-amber-500";
            bgColor = "bg-amber-500/20";
            textColor = "text-amber-400";
          }

          return (
            <motion.button
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={!hasAnswered && !showResult ? { scale: 1.02 } : {}}
              whileTap={!hasAnswered && !showResult ? { scale: 0.98 } : {}}
              disabled={hasAnswered || showResult}
              onClick={() => toggleSelection(index)}
              className={`p-5 rounded-2xl border-2 font-bold text-lg transition-all ${borderColor} ${bgColor} ${textColor} ${
                hasAnswered || showResult ? "cursor-default" : "hover:border-amber-500/50"
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Checkbox */}
                <div
                  className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                    isSelected
                      ? "bg-amber-500 border-amber-500"
                      : "border-gray-500"
                  }`}
                >
                  {isSelected && <span className="text-white text-sm">✓</span>}
                </div>

                <span className="inline-block w-8 h-8 rounded-full bg-gray-700 text-center leading-8 text-sm">
                  {String.fromCharCode(65 + index)}
                </span>

                <span className="flex-1 text-left">{option}</span>

                {showResult && isCorrect && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-emerald-400"
                  >
                    ✓
                  </motion.span>
                )}
                {showResult && isSelected && !isCorrect && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-rose-400"
                  >
                    ✗
                  </motion.span>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Submit Button */}
      {!showResult && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          whileHover={selectedIndices.length > 0 ? { scale: 1.02 } : {}}
          whileTap={selectedIndices.length > 0 ? { scale: 0.98 } : {}}
          disabled={selectedIndices.length === 0 || hasAnswered}
          onClick={handleSubmit}
          className={`w-full p-4 rounded-2xl font-bold text-lg transition-all ${
            selectedIndices.length > 0
              ? "bg-amber-500 text-white hover:bg-amber-600"
              : "bg-gray-700 text-gray-400 cursor-not-allowed"
          }`}
        >
          {isAr
            ? selectedIndices.length > 0
              ? `تأكيد ${selectedIndices.length} ${selectedIndices.length === 1 ? "إجابة" : "إجابات"}`
              : "اختر إجابة واحدة على الأقل"
            : selectedIndices.length > 0
              ? `Confirm ${selectedIndices.length} ${selectedIndices.length === 1 ? "Answer" : "Answers"}`
              : "Select at least one answer"}
        </motion.button>
      )}

      {/* Results Summary */}
      {showResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-gray-800 border border-gray-700"
        >
          <div className="text-center">
            <span className="text-emerald-400 font-bold">
              {isAr ? "الإجابات الصحيحة:" : "Correct Answers:"}
            </span>
            <div className="flex flex-wrap gap-2 mt-2 justify-center">
              {correctAnswers.map((idx: number) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-sm"
                >
                  {String.fromCharCode(65 + idx)}: {options[idx]}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

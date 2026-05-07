"use client";

import { motion } from "framer-motion";
import { GameStatus } from "@quiz-battle/shared";

interface ImageQuestionProps {
  question: any;
  status: GameStatus;
  timeLeft: number;
  selectedAnswer: number | null;
  lastAnswerResult: any;
  language: "en" | "ar";
  onAnswer: (index: number) => void;
}

export function ImageQuestion({
  question,
  status,
  selectedAnswer,
  lastAnswerResult,
  language,
  onAnswer,
}: ImageQuestionProps) {
  const isAr = language === "ar";
  const hasAnswered = selectedAnswer !== null;

  const text = isAr ? question.textAr || question.text : question.textEn || question.text;
  const options = isAr
    ? question.optionsAr || question.options
    : question.optionsEn || question.options;

  return (
    <div className="w-full">
      {/* Question Text */}
      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 mb-4">
        <p className="text-xl md:text-2xl font-bold text-white text-center leading-relaxed">
          {text}
        </p>
      </div>

      {/* Image Display */}
      {question.imageUrl && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 rounded-2xl overflow-hidden border-2 border-gray-800"
        >
          <img
            src={question.imageUrl}
            alt="Question"
            className="w-full max-h-64 object-contain bg-gray-950"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </motion.div>
      )}

      {/* Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(options || []).map((option: string, index: number) => {
          const selected = selectedAnswer === index;
          const isCorrect = question.correctAnswer === index;
          const showResult = status === GameStatus.AnswerReveal || lastAnswerResult;

          let borderColor = "border-gray-700";
          let bgColor = "bg-gray-800";
          let textColor = "text-white";

          if (showResult) {
            if (isCorrect) {
              borderColor = "border-emerald-500";
              bgColor = "bg-emerald-500/20";
              textColor = "text-emerald-400";
            } else if (selected && !isCorrect) {
              borderColor = "border-rose-500";
              bgColor = "bg-rose-500/20";
              textColor = "text-rose-400";
            }
          } else if (selected) {
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
              onClick={() => onAnswer(index)}
              className={`p-5 rounded-2xl border-2 font-bold text-lg transition-all ${borderColor} ${bgColor} ${textColor} ${
                hasAnswered || showResult ? "cursor-default" : "hover:border-amber-500/50"
              }`}
            >
              <span className="inline-block w-8 h-8 rounded-full bg-gray-700 text-center leading-8 mr-3 text-sm">
                {String.fromCharCode(65 + index)}
              </span>
              {option}
              {showResult && isCorrect && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="ml-2 text-emerald-400"
                >
                  ✓
                </motion.span>
              )}
              {showResult && selected && !isCorrect && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="ml-2 text-rose-400"
                >
                  ✗
                </motion.span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

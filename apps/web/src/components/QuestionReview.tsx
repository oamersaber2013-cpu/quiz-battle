"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "../store/gameStore";
import { ClientQuestion } from "@quiz-battle/shared";

interface QuestionReviewProps {
  question: ClientQuestion;
  correctIndex: number;
  explanation?: { en?: string; ar?: string };
  playerAnswers: Record<string, number>;
  isOpen: boolean;
  onClose: () => void;
}

export function QuestionReview({
  question,
  correctIndex,
  explanation,
  playerAnswers,
  isOpen,
  onClose,
}: QuestionReviewProps) {
  const { players, userId, language } = useGameStore();
  const isAr = language === "ar";

  const currentUserAnswer = userId ? playerAnswers[userId] : undefined;
  const isCorrect = currentUserAnswer === correctIndex;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-3xl p-6 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className={isCorrect ? "text-green-400" : "text-red-400"}>
                  {isCorrect ? "✅" : "❌"}
                </span>
                {isAr ? "مراجعة السؤال" : "Question Review"}
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Question */}
            <div className="mb-6">
              <p className="text-white text-lg mb-4">
                {isAr ? question.textAr : question.textEn}
              </p>

              {/* Options */}
              <div className="space-y-2">
                {(isAr ? question.optionsAr : question.optionsEn)?.map((option, index) => {
                  const isCorrectOption = index === correctIndex;
                  const playerCount = Object.values(playerAnswers).filter((a) => a === index).length;

                  return (
                    <div
                      key={index}
                      className={`p-3 rounded-xl border-2 flex items-center justify-between ${
                        isCorrectOption
                          ? "border-green-500 bg-green-500/10"
                          : currentUserAnswer === index
                          ? "border-red-500 bg-red-500/10"
                          : "border-gray-700 bg-gray-800"
                      }`}
                    >
                      <span className={`${isCorrectOption ? "text-green-400 font-bold" : "text-gray-300"}`}>
                        {option}
                        {isCorrectOption && (
                          <span className="ml-2 text-green-500">
                            {isAr ? "(الإجابة الصحيحة)" : "(Correct Answer)"}
                          </span>
                        )}
                      </span>

                      {/* Player count for this option */}
                      {playerCount > 0 && (
                        <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded-full">
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
              <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                <h3 className="text-amber-400 font-bold mb-2 flex items-center gap-2">
                  <span>💡</span>
                  {isAr ? "التفسير" : "Explanation"}
                </h3>
                <p className="text-gray-300">
                  {isAr ? explanation.ar : explanation.en}
                </p>
              </div>
            )}

            {/* Player Answers Summary */}
            <div className="mb-6">
              <h3 className="text-gray-400 font-bold mb-3 text-sm uppercase tracking-wider">
                {isAr ? "إجابات اللاعبين" : "Player Answers"}
              </h3>
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                {players.map((player) => {
                  const answer = playerAnswers[player.userId];
                  const playerCorrect = answer === correctIndex;
                  const options = isAr ? question.optionsAr : question.optionsEn;
                  const optionText = answer !== undefined && options
                    ? options[answer]
                    : isAr ? "لم يجب" : "No answer";

                  return (
                    <div
                      key={player.userId}
                      className={`flex items-center gap-2 p-2 rounded-lg text-sm ${
                        player.userId === userId ? "bg-gray-700" : "bg-gray-800"
                      }`}
                    >
                      <span className={playerCorrect ? "text-green-400" : "text-red-400"}>
                        {playerCorrect ? "✓" : answer !== undefined ? "✗" : "−"}
                      </span>
                      <span className="text-gray-300 truncate flex-1">{player.username}</span>
                      <span className="text-gray-500 text-xs truncate max-w-[80px]">{optionText}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-full py-3 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400 transition-colors"
            >
              {isAr ? "متابعة" : "Continue"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default QuestionReview;

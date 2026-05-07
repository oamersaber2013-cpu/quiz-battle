"use client";

import { motion } from "framer-motion";
import { useGameStore } from "../store/gameStore";
import { GameStatus } from "@quiz-battle/shared";

export function RoundProgress() {
  const { currentRound, totalRounds, language, status } = useGameStore();
  const isAr = language === "ar";

  // Only show during active gameplay
  if (status !== GameStatus.Question && status !== GameStatus.AnswerReveal && status !== GameStatus.Results) {
    return null;
  }

  const progress = totalRounds > 0 ? ((currentRound - 1) / totalRounds) * 100 : 0;

  return (
    <div className="fixed top-4 left-4 right-4 z-30 flex justify-center">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-2xl px-6 py-3 shadow-2xl"
      >
        <div className="flex items-center gap-4">
          {/* Round Counter */}
          <div className="text-center">
            <p className="text-gray-400 text-xs uppercase tracking-wider">
              {isAr ? "الجولة" : "Round"}
            </p>
            <p className="text-2xl font-bold text-white">
              <span className="text-amber-400">{currentRound}</span>
              <span className="text-gray-500">/{totalRounds}</span>
            </p>
          </div>

          {/* Progress Bar */}
          <div className="w-48 h-3 bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
            />
          </div>

          {/* Remaining Indicator */}
          <div className="text-center">
            <p className="text-gray-400 text-xs uppercase tracking-wider">
              {isAr ? "متبقي" : "Left"}
            </p>
            <p className="text-lg font-bold text-white">
              {totalRounds - currentRound + 1}
            </p>
          </div>
        </div>

        {/* Phase Indicator */}
        <div className="flex justify-center gap-1 mt-2">
          {Array.from({ length: totalRounds }, (_, i) => i + 1).map((round) => (
            <div
              key={round}
              className={`w-2 h-2 rounded-full transition-all ${
                round < currentRound
                  ? "bg-green-500"
                  : round === currentRound
                  ? "bg-amber-500 w-4"
                  : "bg-gray-700"
              }`}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}

export default RoundProgress;

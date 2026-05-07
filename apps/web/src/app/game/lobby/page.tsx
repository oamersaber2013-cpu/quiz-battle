"use client";

import { useEffect } from "react";
import { useGameStore } from "@/store/gameStore";
import { InviteLink } from "@/components/InviteLink";
import { useSound } from "@/hooks/useSound";
import { motion } from "framer-motion";

export default function LobbyPage() {
  const { gameId, joinCode, players, hostId, userId, mode, difficulty, totalRounds, language } = useGameStore();
  const { preload } = useSound();
  const isAr = language === "ar";
  const isHost = userId === hostId;

  // Preload sounds on mount
  useEffect(() => {
    preload();
  }, [preload]);

  if (!gameId) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 text-lg">
            {isAr ? "لم يتم العثور على لعبة" : "No game found"}
          </p>
          <a
            href="/"
            className="mt-4 inline-block px-6 py-3 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400 transition-colors"
          >
            {isAr ? "العودة للرئيسية" : "Back to Home"}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-30 bg-gray-900/80 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">
              {isAr ? "الردهة" : "Lobby"}
            </h1>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span className="capitalize">{mode}</span>
              <span>•</span>
              <span className="capitalize">{difficulty}</span>
              <span>•</span>
              <span>{totalRounds} {isAr ? "جولة" : "rounds"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-20 pb-32 px-4 max-w-7xl mx-auto">
        {/* Players Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h2 className="text-xl font-bold mb-4 text-gray-300">
            {isAr ? "اللاعبون" : "Players"} ({players.length})
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {players.map((player, index) => (
              <motion.div
                key={player.userId}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 rounded-2xl border-2 text-center ${
                  player.userId === hostId
                    ? "border-amber-500 bg-amber-500/10"
                    : "border-gray-700 bg-gray-800"
                }`}
              >
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-2xl font-bold text-black">
                  {player.username.charAt(0).toUpperCase()}
                </div>
                <p className="font-bold text-white truncate">{player.username}</p>
                {player.userId === hostId && (
                  <span className="inline-block mt-2 px-2 py-1 bg-amber-500 text-black text-xs font-bold rounded-full">
                    {isAr ? "المضيف" : "HOST"}
                  </span>
                )}
                {player.userId === userId && (
                  <span className="inline-block mt-2 px-2 py-1 bg-blue-500 text-white text-xs font-bold rounded-full">
                    {isAr ? "أنت" : "YOU"}
                  </span>
                )}
              </motion.div>
            ))}

            {/* Empty slots */}
            {Array.from({ length: Math.max(0, 8 - players.length) }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="p-4 rounded-2xl border-2 border-dashed border-gray-800 bg-gray-900/50 text-center"
              >
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-800 flex items-center justify-center text-gray-600">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm">{isAr ? "فارغ" : "Empty"}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Room Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-900 border border-gray-800 rounded-2xl p-6"
        >
          <h2 className="text-xl font-bold mb-4 text-gray-300">
            {isAr ? "إعدادات الغرفة" : "Room Settings"}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-800 rounded-xl">
              <p className="text-gray-400 text-sm">{isAr ? "الوضع" : "Mode"}</p>
              <p className="text-white font-bold capitalize">{mode}</p>
            </div>
            <div className="p-4 bg-gray-800 rounded-xl">
              <p className="text-gray-400 text-sm">{isAr ? "الصعوبة" : "Difficulty"}</p>
              <p className="text-white font-bold capitalize">{difficulty}</p>
            </div>
            <div className="p-4 bg-gray-800 rounded-xl">
              <p className="text-gray-400 text-sm">{isAr ? "الجولات" : "Rounds"}</p>
              <p className="text-white font-bold">{totalRounds}</p>
            </div>
            <div className="p-4 bg-gray-800 rounded-xl">
              <p className="text-gray-400 text-sm">{isAr ? "الكود" : "Code"}</p>
              <p className="text-amber-400 font-bold tracking-wider">{joinCode}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Floating Components */}
      <InviteLink />
    </div>
  );
}

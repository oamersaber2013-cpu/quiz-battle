"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "../store/gameStore";
import { getSocket } from "../lib/socket";

const EMOTES = [
  { id: "thumbs_up", emoji: "👍", label: { en: "Nice!", ar: "ممتاز!" } },
  { id: "clap", emoji: "👏", label: { en: "Good job!", ar: "أحسنت!" } },
  { id: "fire", emoji: "🔥", label: { en: "On fire!", ar: "مشتعل!" } },
  { id: "laugh", emoji: "😂", label: { en: "Haha!", ar: "ههه!" } },
  { id: "sweat", emoji: "😅", label: { en: "Close!", ar: "لحظة!" } },
  { id: "think", emoji: "🤔", label: { en: "Hmm...", ar: "همم..." } },
  { id: "shock", emoji: "😱", label: { en: "Wow!", ar: "واو!" } },
  { id: "cry", emoji: "😭", label: { en: "Oh no!", ar: "يا لهذا!" } },
];

interface FloatingEmote {
  id: string;
  userId: string;
  username: string;
  emoji: string;
  x: number;
  y: number;
}

export function EmoteSystem() {
  const { gameId, userId, players, language } = useGameStore();
  const [isOpen, setIsOpen] = useState(false);
  const [floatingEmotes, setFloatingEmotes] = useState<FloatingEmote[]>([]);
  const socket = getSocket();
  const isAr = language === "ar";

  const sendEmote = (emoteId: string) => {
    if (!gameId) return;
    
    const emote = EMOTES.find((e) => e.id === emoteId);
    if (!emote) return;

    socket.emit("game:emote", { gameId, emote: emoteId });
    
    // Add local floating emote
    addFloatingEmote(userId || "", "You", emote.emoji);
    setIsOpen(false);
  };

  const addFloatingEmote = (userId: string, username: string, emoji: string) => {
    const id = `emote_${Date.now()}_${Math.random()}`;
    const x = Math.random() * 80 + 10; // 10% - 90% of screen width
    const y = Math.random() * 40 + 50; // 50% - 90% of screen height

    const newEmote: FloatingEmote = {
      id,
      userId,
      username,
      emoji,
      x,
      y,
    };

    setFloatingEmotes((prev) => [...prev, newEmote]);

    // Remove after animation
    setTimeout(() => {
      setFloatingEmotes((prev) => prev.filter((e) => e.id !== id));
    }, 2000);
  };

  // Listen for emotes from other players
  socket.on("game:emote", ({ userId: senderId, emote }: { userId: string; emote: string }) => {
    const emoteData = EMOTES.find((e) => e.id === emote);
    if (!emoteData) return;

    const player = players.find((p) => p.userId === senderId);
    if (player) {
      addFloatingEmote(senderId, player.username, emoteData.emoji);
    }
  });

  return (
    <>
      {/* Floating Emotes */}
      <AnimatePresence>
        {floatingEmotes.map((emote) => (
          <motion.div
            key={emote.id}
            initial={{ opacity: 0, scale: 0.5, y: 0 }}
            animate={{ opacity: 1, scale: 1.5, y: -100 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 2, ease: "easeOut" }}
            className="fixed z-50 pointer-events-none"
            style={{
              left: `${emote.x}%`,
              top: `${emote.y}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <div className="text-6xl drop-shadow-lg">{emote.emoji}</div>
            <div className="text-white text-xs font-bold text-center bg-black/50 rounded-full px-2 py-1 mt-1">
              {emote.username}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Emote Button & Menu */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.8 }}
              className="mb-2 bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-2xl p-3 shadow-2xl"
            >
              <div className="grid grid-cols-4 gap-2">
                {EMOTES.map((emote) => (
                  <button
                    key={emote.id}
                    onClick={() => sendEmote(emote.id)}
                    className="flex flex-col items-center p-2 hover:bg-gray-800 rounded-xl transition-colors"
                  >
                    <span className="text-3xl mb-1">{emote.emoji}</span>
                    <span className="text-xs text-gray-400">
                      {isAr ? emote.label.ar : emote.label.en}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsOpen(!isOpen)}
          className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl transition-colors ${
            isOpen
              ? "bg-gray-700 text-white"
              : "bg-amber-500 text-black hover:bg-amber-400"
          }`}
        >
          {isOpen ? "✕" : "😄"}
        </motion.button>
      </div>
    </>
  );
}

export default EmoteSystem;

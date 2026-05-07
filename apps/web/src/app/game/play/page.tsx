"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/gameStore";
import { emitAnswer } from "@/lib/socket";
import { PowerUpEffects } from "@/components/PowerUpEffects";
import { TrueFalseQuestion } from "@/components/TrueFalseQuestion";
import { ImageQuestion } from "@/components/ImageQuestion";
import { AudioQuestion } from "@/components/AudioQuestion";
import { MultiSelectQuestion } from "@/components/MultiSelectQuestion";
import { FillBlankQuestion } from "@/components/FillBlankQuestion";
import { OrderingQuestion } from "@/components/OrderingQuestion";
import { useSound } from "@/hooks/useSound";
import { motion, AnimatePresence } from "framer-motion";
import { GameStatus, GameMode, QuestionType } from "@quiz-battle/shared";
import ChaosGame from "@/components/ChaosGame";
import { ConquestGame } from "@/components/ConquestGame";

// Redirect to the main game page - this page is deprecated
// The real game is at /game/[gameId]
export default function GamePlayPage() {
  const router = useRouter();
  const { gameId, mode, status, language } = useGameStore();
  const isAr = language === "ar";

  useEffect(() => {
    if (gameId) {
      router.replace(`/game/${gameId}`);
    } else {
      router.replace("/");
    }
  }, [gameId, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div style={{ fontSize: "3rem", marginBottom: 16, animation: "float 2s ease-in-out infinite" }}>⚔️</div>
        <div className="text-muted">{isAr ? "جاري التحميل..." : "Loading game..."}</div>
      </div>
    </div>
  );
}

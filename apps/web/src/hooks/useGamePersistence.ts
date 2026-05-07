"use client";

import { useEffect, useCallback } from "react";
import { useGameStore } from "../store/gameStore";
import { GameStatus } from "@quiz-battle/shared";

const STORAGE_KEY = "quiz_battle_game_state";

interface SavedGameState {
  gameId: string;
  joinCode: string | null;
  userId: string;
  timestamp: number;
}

export function useGamePersistence() {
  const { gameId, joinCode, userId, status, addToast } = useGameStore();

  // Save game state when it changes
  const saveState = useCallback(() => {
    const gs = useGameStore.getState();
    const isAr = gs.language === "ar";
    if (!gameId || !userId) return;

    // Only save during active gameplay (lobby, powerup select, playing)
    const savableStatuses = [
      GameStatus.Lobby,
      "powerup_select", // PowerUpSelect status
      GameStatus.Countdown,
      GameStatus.Question,
      GameStatus.AnswerReveal,
    ];

    if (!savableStatuses.includes(status)) {
      // Clear saved state if game ended
      localStorage.removeItem(STORAGE_KEY);
      // Success notification
      addToast('success', gs.language === 'ar' ? '✅ تم حفظ اللعبة!' : 'Game saved!');
      return;
    }

    const state: SavedGameState = {
      gameId,
      joinCode,
      userId,
      timestamp: Date.now(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    console.log("[GamePersistence] Saved state:", state);
  }, [gameId, joinCode, userId, status]);

  // Auto-save every 5 seconds during gameplay
  useEffect(() => {
    if (!gameId) return;

    const interval = setInterval(saveState, 5000);
    return () => clearInterval(interval);
  }, [gameId, saveState]);

  // Save on visibility change (tab switch/close)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        saveState();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [saveState]);

  // Save before unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveState();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [saveState]);
}

export function checkForSavedGame(): SavedGameState | null {
  if (typeof window === "undefined") return null;

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;

    const state: SavedGameState = JSON.parse(saved);

    // Check if saved state is recent (within last 30 minutes)
    const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
    if (state.timestamp < thirtyMinutesAgo) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return state;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function clearSavedGame() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export default useGamePersistence;

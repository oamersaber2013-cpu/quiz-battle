"use client";

import { useCallback } from "react";
import { useGameStore } from "../store/gameStore";
import { playCue, type SoundType } from "@/lib/sounds";

export type { SoundType } from "@/lib/sounds";

export function useSound() {
  const soundEnabled = useGameStore(state => state.soundEnabled);
  const toggleSound = useGameStore(state => state.toggleSound);
  const play = useCallback((type: SoundType, volume = 0.5) => {
    if (soundEnabled) playCue(type, volume);
  }, [soundEnabled]);
  return { play, soundEnabled, toggleSound };
}

export default useSound;

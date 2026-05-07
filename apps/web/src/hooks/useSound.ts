"use client";

import { useCallback, useRef } from "react";
import { useGameStore } from "../store/gameStore";

export type SoundType =
  | "correct"
  | "wrong"
  | "tick"
  | "powerup"
  | "shield"
  | "freeze"
  | "steal"
  | "win"
  | "lose"
  | "join"
  | "leave"
  | "ready"
  | "start"
  | "chat"
  | "click";

// Base64 encoded short sound effects (placeholders - replace with actual audio files)
const SOUND_URLS: Record<SoundType, string> = {
  correct: "/sounds/correct.mp3",
  wrong: "/sounds/wrong.mp3",
  tick: "/sounds/tick.mp3",
  powerup: "/sounds/powerup.mp3",
  shield: "/sounds/shield.mp3",
  freeze: "/sounds/freeze.mp3",
  steal: "/sounds/steal.mp3",
  win: "/sounds/win.mp3",
  lose: "/sounds/lose.mp3",
  join: "/sounds/join.mp3",
  leave: "/sounds/leave.mp3",
  ready: "/sounds/ready.mp3",
  start: "/sounds/start.mp3",
  chat: "/sounds/chat.mp3",
  click: "/sounds/click.mp3",
};

export function useSound() {
  const { soundEnabled, toggleSound } = useGameStore();
  const audioRefs = useRef<Record<SoundType, HTMLAudioElement | null>>({
    correct: null,
    wrong: null,
    tick: null,
    powerup: null,
    shield: null,
    freeze: null,
    steal: null,
    win: null,
    lose: null,
    join: null,
    leave: null,
    ready: null,
    start: null,
    chat: null,
    click: null,
  });

  const play = useCallback(
    (type: SoundType, volume = 0.5) => {
      if (!soundEnabled) return;

      try {
        let audio = audioRefs.current[type];
        if (!audio) {
          audio = new Audio(SOUND_URLS[type]);
          audioRefs.current[type] = audio;
        }
        audio.volume = volume;
        audio.currentTime = 0;
        audio.play().catch(() => {
          // Audio play failed (user interaction required)
        });
      } catch {
        // Ignore audio errors
      }
    },
    [soundEnabled]
  );

  // Preload sounds
  const preload = useCallback(() => {
    Object.keys(SOUND_URLS).forEach((type) => {
      const audio = new Audio(SOUND_URLS[type as SoundType]);
      audio.load();
      audioRefs.current[type as SoundType] = audio;
    });
  }, []);

  return { play, preload, soundEnabled, toggleSound };
}

export default useSound;

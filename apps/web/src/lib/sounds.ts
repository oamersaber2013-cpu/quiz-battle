import { GameMode } from "@quiz-battle/shared";

const cues = {
  tick: [690], correct: [523, 659, 784], wrong: [310, 207], click: [520],
  powerup: [392, 494, 660], shield: [330, 530], freeze: [880, 740],
  steal: [540, 330, 590], win: [523, 659, 784, 1047], lose: [392, 330, 262],
  join: [440, 554], leave: [554, 440], ready: [660, 880], start: [392, 523, 784],
  chat: [660, 740], survival: [196, 196], conquest: [262, 392, 523], chaos: [415, 622, 466],
} as const;

export type SoundType = keyof typeof cues;
let context: AudioContext | undefined;

export function playCue(type: SoundType, volume = 0.4) {
  if (typeof window === "undefined" || !window.AudioContext || volume <= 0) return;
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
  try {
    if (!context || context.state === "closed") context = new AudioContext();
    const audio = context;
    const play = () => {
      if (audio.state !== "running") return;
      const duration = type === "tick" || type === "click" ? 0.045 : 0.11;
      cues[type].forEach((frequency, index) => {
        const start = audio.currentTime + index * duration;
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, Math.min(volume, 1) * 0.2), start + 0.009);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        oscillator.connect(gain).connect(audio.destination);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
        oscillator.start(start);
        oscillator.stop(start + duration);
      });
    };
    if (audio.state === "suspended") void audio.resume().then(play).catch(() => {});
    else play();
  } catch {
    // Devices can suspend or close audio when the tab moves to the background.
  }
}

export const soundManager = {
  play(key: "TICK" | "CLICK" | "CORRECT" | "WRONG") {
    playCue(({ TICK: "tick", CLICK: "click", CORRECT: "correct", WRONG: "wrong" } as const)[key]);
  },
  playModeSound(mode: GameMode) {
    const modeCues: Record<GameMode, SoundType> = {
      [GameMode.Classic]: "start", [GameMode.Survival]: "survival", [GameMode.Conquest]: "conquest",
      [GameMode.Chaos]: "chaos", [GameMode.Custom]: "start",
    };
    playCue(modeCues[mode]);
  },
};

import { GameMode } from "@quiz-battle/shared";

export const SOUNDS = {
  // Common
  TICK: "https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3",
  CORRECT: "https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3",
  WRONG: "https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3",
  
  // Mode Specific
  CHAOS_START: "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3", // Fast whoosh
  SURVIVAL_GASP: "https://assets.mixkit.co/active_storage/sfx/2184/2184-preview.mp3", // Heartbeat/Gasp
  CONQUEST_CLASH: "https://assets.mixkit.co/active_storage/sfx/2045/2045-preview.mp3", // Sword clash
  CONQUEST_MARCH: "https://assets.mixkit.co/active_storage/sfx/2046/2046-preview.mp3", // Marching
  CLASSIC_CRYSTAL: "https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3", // Magic chime
};

class SoundManager {
  private enabled: boolean = true;
  private audios: Record<string, HTMLAudioElement> = {};

  constructor() {
    if (typeof window !== "undefined") {
      Object.entries(SOUNDS).forEach(([key, url]) => {
        const audio = new Audio(url);
        audio.preload = "auto";
        this.audios[key] = audio;
      });
    }
  }

  play(key: keyof typeof SOUNDS) {
    if (!this.enabled || !this.audios[key]) return;
    const sound = this.audios[key].cloneNode() as HTMLAudioElement;
    sound.volume = 0.4;
    sound.play().catch(() => {});
  }

  playModeSound(mode: GameMode) {
    switch (mode) {
      case GameMode.Classic: this.play("CLASSIC_CRYSTAL"); break;
      case GameMode.Survival: this.play("SURVIVAL_GASP"); break;
      case GameMode.Conquest: this.play("CONQUEST_CLASH"); break;
      case GameMode.Chaos: this.play("CHAOS_START"); break;
    }
  }
}

export const soundManager = new SoundManager();

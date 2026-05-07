// ═══════════════════════════════════════════════════════════════════════════════
// WARRIOR CHARACTERS - Mode-Specific Avatars
// ═══════════════════════════════════════════════════════════════════════════════

import { GameMode } from "./enums";

export interface WarriorCharacter {
  id: string;
  name: { en: string; ar: string };
  description: { en: string; ar: string };
  mode: GameMode;
  icon: string;
  emoji: string;
  avatarSvg: string;
  color: string;
  glowColor: string;
  abilities: string[];
  fortBonus: number;
  attackBonus: number;
  specialPower: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLASSIC MODE WARRIORS - The Timeless Champions
// ═══════════════════════════════════════════════════════════════════════════════
export const CLASSIC_WARRIORS: WarriorCharacter[] = [
  {
    id: "classic_knight",
    name: { en: "Mystic Knight", ar: "الفارس السحري" },
    description: {
      en: "A solitary warrior bound by honor, wielding the Sword of Knowledge",
      ar: "محارب منعزل يحمل سيف المعرفة",
    },
    mode: GameMode.Classic,
    icon: "⚔️",
    emoji: "🛡️",
    avatarSvg: `<svg viewBox="0 0 100 100"><defs><linearGradient id="knightGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#6c63ff"/><stop offset="100%" style="stop-color:#a855f7"/></linearGradient></defs><circle cx="50" cy="50" r="45" fill="url(#knightGrad)" stroke="#fff" stroke-width="2"/><text x="50" y="65" font-size="45" text-anchor="middle">⚔️</text><circle cx="50" cy="50" r="48" fill="none" stroke="#6c63ff" stroke-width="2" opacity="0.5"><animate attributeName="r" values="48;52;48" dur="2s" repeatCount="indefinite"/></circle></svg>`,
    color: "#6c63ff",
    glowColor: "rgba(108, 99, 255, 0.6)",
    abilities: ["Knowledge Strike", "Solo Focus", "Wisdom Shield"],
    fortBonus: 1.2,
    attackBonus: 1.1,
    specialPower: "Lone Wolf: +20% score when only one territory owned",
  },
  {
    id: "classic_wanderer",
    name: { en: "Eternal Wanderer", ar: "الرحال الأبدي" },
    description: {
      en: "A seeker of wisdom who travels the world alone",
      ar: "باحث عن الحكمة يسافر العالم بمفرده",
    },
    mode: GameMode.Classic,
    icon: "🗺️",
    emoji: "🧭",
    avatarSvg: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#6366f1" stroke="#fff" stroke-width="2"/><text x="50" y="65" font-size="45" text-anchor="middle">🗺️</text></svg>`,
    color: "#6366f1",
    glowColor: "rgba(99, 102, 241, 0.6)",
    abilities: ["World Traveler", "Map Mastery", "Explorer's Eye"],
    fortBonus: 1.0,
    attackBonus: 1.2,
    specialPower: "Explorer: Can attack any adjacent territory regardless of ownership",
  },
  {
    id: "classic_scholar",
    name: { en: "Ancient Scholar", ar: "العالم القديم" },
    description: {
      en: "Master of ancient texts and forgotten knowledge",
      ar: "سيد النصوص القديمة والمعرفة المنسية",
    },
    mode: GameMode.Classic,
    icon: "📜",
    emoji: "🧙",
    avatarSvg: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#7c3aed" stroke="#ffd700" stroke-width="2"/><text x="50" y="65" font-size="45" text-anchor="middle">📜</text></svg>`,
    color: "#7c3aed",
    glowColor: "rgba(124, 58, 237, 0.6)",
    abilities: ["Ancient Wisdom", "Text Mastery", "Timeless Knowledge"],
    fortBonus: 1.3,
    attackBonus: 1.0,
    specialPower: "Ancient Text: 50% chance to reveal correct answer category",
  },
  {
    id: "classic_flash",
    name: { en: "Lightning Flash", ar: "البرق الخاطف" },
    description: {
      en: "Moves faster than the eye can see",
      ar: "يتحرك أسرع من أن تراه العين",
    },
    mode: GameMode.Classic,
    icon: "⚡",
    emoji: "🏃",
    avatarSvg: `<svg viewBox="0 0 100 100"><defs><linearGradient id="flashGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#ffd700"/><stop offset="100%" style="stop-color:#ffa502"/></linearGradient></defs><circle cx="50" cy="50" r="45" fill="url(#flashGrad)" stroke="#ffd700" stroke-width="3"/><text x="50" y="65" font-size="45" text-anchor="middle">⚡</text></svg>`,
    color: "#ffd700",
    glowColor: "rgba(255, 215, 0, 0.8)",
    abilities: ["Lightning Speed", "Quick Strike", "Flash Step"],
    fortBonus: 0.8,
    attackBonus: 1.5,
    specialPower: "Speed Demon: +2 seconds bonus time on every question",
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SURVIVAL MODE WARRIORS - The Undying Survivors
// ═══════════════════════════════════════════════════════════════════════════════
export const SURVIVAL_WARRIORS: WarriorCharacter[] = [
  {
    id: "survival_undead",
    name: { en: "Undead Lich", ar: "اللورد الميت" },
    description: {
      en: "A fearsome undead warrior that refuses to fall",
      ar: "محارب ميت مخيف يرفض السقوط",
    },
    mode: GameMode.Survival,
    icon: "💀",
    emoji: "🦴",
    avatarSvg: `<svg viewBox="0 0 100 100"><defs><radialGradient id="lichGrad" cx="50%" cy="50%"><stop offset="0%" style="stop-color:#ff4757"/><stop offset="100%" style="stop-color:#2f3542"/></radialGradient></defs><circle cx="50" cy="50" r="45" fill="url(#lichGrad)" stroke="#ff4757" stroke-width="3"/><text x="50" y="65" font-size="45" text-anchor="middle">💀</text><circle cx="50" cy="50" r="48" fill="none" stroke="#ff4757" stroke-width="2" opacity="0.8"><animate attributeName="opacity" values="0.8;0.3;0.8" dur="1.5s" repeatCount="indefinite"/></circle></svg>`,
    color: "#ff4757",
    glowColor: "rgba(255, 71, 87, 0.7)",
    abilities: ["Undead Resilience", "Death Ward", "Soul Drain"],
    fortBonus: 1.0,
    attackBonus: 1.3,
    specialPower: "Second Life: One free wrong answer per game (no elimination)",
  },
  {
    id: "survival_hunter",
    name: { en: "Shadow Hunter", ar: "الصياد الظل" },
    description: {
      en: "A predator that thrives in high-pressure situations",
      ar: "مفترس يزدهر في المواقف العالية الضغط",
    },
    mode: GameMode.Survival,
    icon: "🏹",
    emoji: "🐺",
    avatarSvg: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#ff6348" stroke="#2f3542" stroke-width="3"/><text x="50" y="65" font-size="45" text-anchor="middle">🏹</text></svg>`,
    color: "#ff6348",
    glowColor: "rgba(255, 99, 72, 0.6)",
    abilities: ["Precision Shot", "Survival Instinct", "Predator Focus"],
    fortBonus: 0.9,
    attackBonus: 1.4,
    specialPower: "Predator: Deals +30% damage when attacking territories with 3+ troops",
  },
  {
    id: "survival_phoenix",
    name: { en: "Phoenix Reborn", ar: "العنقاء المولدة" },
    description: {
      en: "Rises from defeat stronger than before",
      ar: "تنهض من الهزيمة أقوى من قبل",
    },
    mode: GameMode.Survival,
    icon: "🔥",
    emoji: "🐦",
    avatarSvg: `<svg viewBox="0 0 100 100"><defs><linearGradient id="phoenixGrad" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" style="stop-color:#ff4757"/><stop offset="50%" style="stop-color:#ffa502"/><stop offset="100%" style="stop-color:#ff3838"/></linearGradient></defs><circle cx="50" cy="50" r="45" fill="url(#phoenixGrad)" stroke="#ffa502" stroke-width="3"/><text x="50" y="65" font-size="45" text-anchor="middle">🔥</text></svg>`,
    color: "#ffa502",
    glowColor: "rgba(255, 165, 2, 0.7)",
    abilities: ["Rebirth", "Flame Shield", "Rising Power"],
    fortBonus: 1.1,
    attackBonus: 1.2,
    specialPower: "Rebirth: After losing a battle, next attack deals +50% damage",
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// CONQUEST MODE WARRIORS - The World Conquerors
// ═══════════════════════════════════════════════════════════════════════════════
export const CONQUEST_WARRIORS: WarriorCharacter[] = [
  {
    id: "conquest_khan",
    name: { en: "Genghis Khan", ar: "جنكيز خان" },
    description: {
      en: "The great conqueror who rules vast territories",
      ar: "الفاتح العظيم الذي يحكم الأقاليم الشاسعة",
    },
    mode: GameMode.Conquest,
    icon: "👑",
    emoji: "🐎",
    avatarSvg: `<svg viewBox="0 0 100 100"><defs><linearGradient id="khanGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#2ed573"/><stop offset="100%" style="stop-color:#1e90ff"/></linearGradient></defs><circle cx="50" cy="50" r="45" fill="url(#khanGrad)" stroke="#2ed573" stroke-width="3"/><text x="50" y="65" font-size="45" text-anchor="middle">👑</text><circle cx="50" cy="50" r="48" fill="none" stroke="#ffd700" stroke-width="2" stroke-dasharray="5,5"><animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="10s" repeatCount="indefinite"/></circle></svg>`,
    color: "#2ed573",
    glowColor: "rgba(46, 213, 115, 0.7)",
    abilities: ["Mongol Horde", "Empire Builder", "Vast Conquest"],
    fortBonus: 1.3,
    attackBonus: 1.2,
    specialPower: "Empire: Each owned territory gives +5% bonus to all attacks",
  },
  {
    id: "conquest_caesar",
    name: { en: "Imperial Caesar", ar: "القيصر الإمبراطوري" },
    description: {
      en: "Roman emperor who builds an empire through strategy",
      ar: "إمبراطور روماني يبني إمبراطورية من خلال الاستراتيجية",
    },
    mode: GameMode.Conquest,
    icon: "🏛️",
    emoji: "⚔️",
    avatarSvg: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#1e90ff" stroke="#2ed573" stroke-width="3"/><text x="50" y="65" font-size="45" text-anchor="middle">🏛️</text></svg>`,
    color: "#1e90ff",
    glowColor: "rgba(30, 144, 255, 0.6)",
    abilities: ["Roman Legion", "Imperial Strategy", "Empire Defense"],
    fortBonus: 1.5,
    attackBonus: 1.0,
    specialPower: "Legion: Forts have +50% health, can rebuild forts faster",
  },
  {
    id: "conquest_napoleon",
    name: { en: "Strategic Napoleon", ar: "نابليون الاستراتيجي" },
    description: {
      en: "Master tactician who conquers through brilliant strategy",
      ar: "سيد التكتيك الذي يفتح من خلال الاستراتيجية الرائعة",
    },
    mode: GameMode.Conquest,
    icon: "🎖️",
    emoji: "🐴",
    avatarSvg: `<svg viewBox="0 0 100 100"><defs><linearGradient id="napGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#2ed573"/><stop offset="50%" style="stop-color:#7bed9f"/><stop offset="100%" style="stop-color:#1e90ff"/></linearGradient></defs><circle cx="50" cy="50" r="45" fill="url(#napGrad)" stroke="#7bed9f" stroke-width="3"/><text x="50" y="65" font-size="45" text-anchor="middle">🎖️</text></svg>`,
    color: "#7bed9f",
    glowColor: "rgba(123, 237, 159, 0.6)",
    abilities: ["Grand Strategy", "Tactical Mastery", "Art of War"],
    fortBonus: 1.2,
    attackBonus: 1.3,
    specialPower: "Tactics: Can see opponent's troop count before attacking",
  },
  {
    id: "conquest_alexander",
    name: { en: "Alexander the Great", ar: "الإسكندر الأكبر" },
    description: {
      en: "Legendary conqueror who never lost a battle",
      ar: "فاتح أسطوري لم يخسر معركة قط",
    },
    mode: GameMode.Conquest,
    icon: "⚔️",
    emoji: "🏺",
    avatarSvg: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#ffd700" stroke="#2ed573" stroke-width="3"/><text x="50" y="65" font-size="45" text-anchor="middle">⚔️</text></svg>`,
    color: "#ffd700",
    glowColor: "rgba(255, 215, 0, 0.7)",
    abilities: ["Undefeated", "Phalanx Formation", "Legendary Conquest"],
    fortBonus: 1.1,
    attackBonus: 1.4,
    specialPower: "Undefeated: Win streak gives +15% damage per consecutive win",
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// CHAOS MODE WARRIORS - The Unpredictable Agents of Chaos
// ═══════════════════════════════════════════════════════════════════════════════
export const CHAOS_WARRIORS: WarriorCharacter[] = [
  {
    id: "chaos_chimera",
    name: { en: "Mythic Chimera", ar: "الكيميرا الأسطورية" },
    description: {
      en: "A hybrid beast with multiple unpredictable forms",
      ar: "وحش هجين بأشكال لا يمكن التنبؤ بها",
    },
    mode: GameMode.Chaos,
    icon: "🐉",
    emoji: "🦁",
    avatarSvg: `<svg viewBox="0 0 100 100"><defs><linearGradient id="chimeraGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#ff00ff"/><stop offset="50%" style="stop-color:#00ffff"/><stop offset="100%" style="stop-color:#ff00ff"/></linearGradient></defs><circle cx="50" cy="50" r="45" fill="url(#chimeraGrad)" stroke="#ff00ff" stroke-width="3"/><text x="50" y="65" font-size="45" text-anchor="middle">🐉</text><circle cx="50" cy="50" r="48" fill="none" stroke="#00ffff" stroke-width="2" opacity="0.6"><animate attributeName="r" values="48;50;48" dur="2s" repeatCount="indefinite"/></circle></svg>`,
    color: "#ff00ff",
    glowColor: "rgba(255, 0, 255, 0.6)",
    abilities: ["Form Shift", "Chaos Surge", "Unpredictable"],
    fortBonus: 1.1,
    attackBonus: 1.2,
    specialPower: "Chaos Form: Randomly activates one of 3 bonus effects each round",
  },
  {
    id: "chaos_trickster",
    name: { en: "Eternal Trickster", ar: "المخادع الأبدي" },
    description: {
      en: "Thrives in disorder, bends reality to their will",
      ar: "يزدهر في الفوضى، يطوع الواقع لإرادته",
    },
    mode: GameMode.Chaos,
    icon: "🎭",
    emoji: "🌊",
    avatarSvg: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#4ecdc4" stroke="#ff00ff" stroke-width="3"/><text x="50" y="65" font-size="45" text-anchor="middle">🎭</text></svg>`,
    color: "#4ecdc4",
    glowColor: "rgba(78, 205, 196, 0.6)",
    abilities: ["Trick Shot", "Reality Bend", "Chaos Mimic"],
    fortBonus: 1.0,
    attackBonus: 1.3,
    specialPower: "Mimic: Can copy any opponent's special power once per game",
  },
  {
    id: "chaos_anarchy",
    name: { en: "Lord of Anarchy", ar: "سيد الفوضى" },
    description: {
      en: "Where order ends, this warrior thrives",
      ar: "حيث ينتهي النظام، يزدهر هذا المحارب",
    },
    mode: GameMode.Chaos,
    icon: "😈",
    emoji: "🔮",
    avatarSvg: `<svg viewBox="0 0 100 100"><defs><linearGradient id="anarchyGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#ff00ff"/><stop offset="100%" style="stop-color:#ff4757"/></linearGradient></defs><circle cx="50" cy="50" r="45" fill="url(#anarchyGrad)" stroke="#ff4757" stroke-width="3"/><text x="50" y="65" font-size="45" text-anchor="middle">😈</text></svg>`,
    color: "#ff4757",
    glowColor: "rgba(255, 71, 87, 0.7)",
    abilities: ["Anarchy Wave", "Chaos Domination", "Power Surge"],
    fortBonus: 1.15,
    attackBonus: 1.35,
    specialPower: "Anarchy: Gets average of all active chaos bonuses combined",
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOM MODE WARRIORS - The Wildcards
// ═══════════════════════════════════════════════════════════════════════════════
export const CUSTOM_WARRIORS: WarriorCharacter[] = [
  {
    id: "custom_architect",
    name: { en: "The Architect", ar: "المهندس" },
    description: {
      en: "Builds their own rules and fights by them",
      ar: "يبني قواعده ويقاتل بها",
    },
    mode: GameMode.Custom,
    icon: "⚙️",
    emoji: "🔧",
    avatarSvg: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#8b5cf6" stroke="#a78bfa" stroke-width="3"/><text x="50" y="65" font-size="45" text-anchor="middle">⚙️</text></svg>`,
    color: "#8b5cf6",
    glowColor: "rgba(139, 92, 246, 0.6)",
    abilities: ["Custom Rules", "Self-Config", "Adaptive Build"],
    fortBonus: 1.2,
    attackBonus: 1.2,
    specialPower: "Blueprint: Can modify one rule each round within allowed bounds",
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export function getWarriorsForMode(mode: GameMode): WarriorCharacter[] {
  switch (mode) {
    case GameMode.Classic:
      return CLASSIC_WARRIORS;
    case GameMode.Survival:
      return SURVIVAL_WARRIORS;
    case GameMode.Conquest:
      return CONQUEST_WARRIORS;
    case GameMode.Chaos:
      return CHAOS_WARRIORS;
    case GameMode.Custom:
      return CUSTOM_WARRIORS;
    default:
      return CLASSIC_WARRIORS;
  }
}

export function getRandomWarriorForMode(mode: GameMode): WarriorCharacter {
  const warriors = getWarriorsForMode(mode);
  return warriors[Math.floor(Math.random() * warriors.length)];
}

export function getWarriorById(id: string): WarriorCharacter | undefined {
  const allWarriors = [
    ...CLASSIC_WARRIORS,
    ...SURVIVAL_WARRIORS,
    ...CONQUEST_WARRIORS,
    ...CHAOS_WARRIORS,
    ...CUSTOM_WARRIORS,
  ];
  return allWarriors.find((w) => w.id === id);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TERRITORY FORT STYLES - Visual themes for forts based on warrior type
// ═══════════════════════════════════════════════════════════════════════════════

export interface FortStyle {
  name: string;
  icon: string;
  color: string;
  pattern: string;
}

export const FORT_STYLES: Record<string, FortStyle> = {
  default: { name: "Standard Fort", icon: "🏰", color: "#6c63ff", pattern: "fortress" },
  knight:  { name: "Knight's Castle", icon: "🏰", color: "#6c63ff", pattern: "medieval" },
  undead:  { name: "Dark Citadel", icon: "🦇", color: "#ff4757", pattern: "gothic" },
  flash:   { name: "Lightning Spire", icon: "⚡", color: "#ffd700", pattern: "electric" },
  khan:    { name: "Mongol Yurt", icon: "🎪", color: "#2ed573", pattern: "nomadic" },
  caesar:  { name: "Roman Colosseum", icon: "🏛️", color: "#1e90ff", pattern: "imperial" },
  chimera: { name: "Chaos Stronghold", icon: "🐉", color: "#ff00ff", pattern: "chaos" },
};

// Export all warrior collections
export const ALL_WARRIORS = [
  ...CLASSIC_WARRIORS,
  ...SURVIVAL_WARRIORS,
  ...CONQUEST_WARRIORS,
  ...CHAOS_WARRIORS,
  ...CUSTOM_WARRIORS,
];

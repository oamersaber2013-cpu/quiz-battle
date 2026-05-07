// ═══════════════════════════════════════════════════════════════════════════════
// WORLD MAP DATA — 10 Realistic Regions
// Matches the frontend WorldMap.tsx CONTINENTS array (IDs "1" through "10")
// ═══════════════════════════════════════════════════════════════════════════════

export interface WorldTerritory {
  id: string;
  name: string;
  nameAr: string;
  icon: string;
  path: string;
  center: { x: number; y: number };
  labelPos: { x: number; y: number };
  adjacentIds: string[];
  region: "NA" | "SA" | "EU" | "AF" | "AS" | "OC";
}

// 10 world regions — these IDs ("1"–"10") must match the frontend WorldMap.tsx
export const WORLD_TERRITORIES: WorldTerritory[] = [
  {
    id: "1", name: "North America", nameAr: "أمريكا الشمالية", icon: "🦅",
    path: "", center: { x: 148, y: 95 }, labelPos: { x: 148, y: 95 },
    adjacentIds: ["2", "3", "5"], region: "NA",
  },
  {
    id: "2", name: "South America", nameAr: "أمريكا الجنوبية", icon: "🦜",
    path: "", center: { x: 228, y: 275 }, labelPos: { x: 228, y: 275 },
    adjacentIds: ["1", "4"], region: "SA",
  },
  {
    id: "3", name: "Europe", nameAr: "أوروبا", icon: "🏰",
    path: "", center: { x: 475, y: 82 }, labelPos: { x: 475, y: 82 },
    adjacentIds: ["1", "4", "5", "6"], region: "EU",
  },
  {
    id: "4", name: "Africa", nameAr: "أفريقيا", icon: "🦁",
    path: "", center: { x: 492, y: 235 }, labelPos: { x: 492, y: 235 },
    adjacentIds: ["2", "3", "6"], region: "AF",
  },
  {
    id: "5", name: "Russia", nameAr: "روسيا", icon: "🐻",
    path: "", center: { x: 665, y: 48 }, labelPos: { x: 665, y: 48 },
    adjacentIds: ["1", "3", "6", "8"], region: "AS",
  },
  {
    id: "6", name: "Middle East", nameAr: "الشرق الأوسط", icon: "🕌",
    path: "", center: { x: 578, y: 148 }, labelPos: { x: 578, y: 148 },
    adjacentIds: ["3", "4", "5", "7"], region: "AS",
  },
  {
    id: "7", name: "India", nameAr: "الهند", icon: "🛕",
    path: "", center: { x: 650, y: 185 }, labelPos: { x: 650, y: 185 },
    adjacentIds: ["6", "8", "9"], region: "AS",
  },
  {
    id: "8", name: "East Asia", nameAr: "شرق آسيا", icon: "🏯",
    path: "", center: { x: 738, y: 118 }, labelPos: { x: 738, y: 118 },
    adjacentIds: ["5", "7", "9"], region: "AS",
  },
  {
    id: "9", name: "Southeast Asia", nameAr: "جنوب شرق آسيا", icon: "🎋",
    path: "", center: { x: 728, y: 215 }, labelPos: { x: 728, y: 215 },
    adjacentIds: ["7", "8", "10"], region: "AS",
  },
  {
    id: "10", name: "Australia", nameAr: "أستراليا", icon: "🦘",
    path: "", center: { x: 812, y: 355 }, labelPos: { x: 812, y: 355 },
    adjacentIds: ["9"], region: "OC",
  },
];

// Dynamic territory selection based on player count
export function getTerritoriesForPlayerCount(playerCount: number): WorldTerritory[] {
  // With 10 total regions, scale based on player count
  const count = Math.max(2, Math.min(6, playerCount));

  const territoryCounts: Record<number, number> = {
    2: 6,   // 3 per player
    3: 9,   // 3 per player
    4: 8,   // 2 per player
    5: 10,  // 2 per player
    6: 10,  // ~1.6 per player (forces conflict early)
  };

  const numTerritories = territoryCounts[count] || 10;
  return WORLD_TERRITORIES.slice(0, numTerritories);
}

// Fort positions based on player count (spread across the map)
export function getFortIdsForPlayerCount(playerCount: number): string[] {
  const fortAssignments: Record<number, string[]> = {
    2: ["1", "10"],                            // North America, Australia
    3: ["1", "4", "8"],                        // North America, Africa, East Asia
    4: ["1", "4", "8", "10"],                  // Spread across all
    5: ["1", "3", "4", "8", "10"],             // Cover all areas
    6: ["1", "2", "3", "6", "8", "10"],        // Full coverage
  };
  return fortAssignments[playerCount] || fortAssignments[2];
}

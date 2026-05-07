import { Server } from "socket.io";
import type { SafeRedis } from "./redis";
import { Difficulty, ServerToClientEvents, ClientToServerEvents } from "@quiz-battle/shared";
import { fetchQuestions } from "./questions";

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

// ─── Invasion Territory Definition ───────────────────────────
export interface InvasionTerritory {
  id: number;
  name: string;
  nameAr: string;
  path: string; // SVG path for visual rendering
  center: { x: number; y: number }; // Center point for placing troops/icons
  ownerId: string | null;
  troopCount: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REAL WORLD TERRITORIES — 20 Countries with Accurate Geography
// Scales based on player count: 3 players → 15 territories, 5 players → 20
// ═══════════════════════════════════════════════════════════════════════════════

export const INVASION_TERRITORIES: InvasionTerritory[] = [
  // North America (0-2)
  { id: 0, name: "Canada", nameAr: "كندا", path: "M50,15 L95,10 L110,30 L85,50 L55,45 L40,25 Z", center: { x: 75, y: 28 }, ownerId: null, troopCount: 0 },
  { id: 1, name: "USA", nameAr: "الولايات المتحدة", path: "M55,52 L110,48 L120,75 L70,82 L50,65 Z", center: { x: 85, y: 65 }, ownerId: null, troopCount: 0 },
  { id: 2, name: "Mexico", nameAr: "المكسيك", path: "M55,85 L90,80 L100,100 L65,110 L50,100 Z", center: { x: 75, y: 95 }, ownerId: null, troopCount: 0 },
  
  // South America (3-6)
  { id: 3, name: "Colombia", nameAr: "كولومبيا", path: "M85,112 L115,108 L120,125 L95,130 L80,120 Z", center: { x: 100, y: 118 }, ownerId: null, troopCount: 0 },
  { id: 4, name: "Brazil", nameAr: "البرازيل", path: "M95,135 L140,128 L155,160 L125,180 L95,165 L85,145 Z", center: { x: 120, y: 155 }, ownerId: null, troopCount: 0 },
  { id: 5, name: "Argentina", nameAr: "الأرجنتين", path: "M95,185 L125,180 L115,235 L90,225 Z", center: { x: 108, y: 208 }, ownerId: null, troopCount: 0 },
  { id: 6, name: "Chile", nameAr: "تشيلي", path: "M80,180 L95,178 L85,240 L75,235 Z", center: { x: 82, y: 210 }, ownerId: null, troopCount: 0 },
  
  // Europe (7-9)
  { id: 7, name: "UK", nameAr: "بريطانيا", path: "M125,35 L145,32 L148,48 L128,52 L120,45 Z", center: { x: 135, y: 42 }, ownerId: null, troopCount: 0 },
  { id: 8, name: "France", nameAr: "فرنسا", path: "M145,55 L168,52 L172,75 L148,80 L140,68 Z", center: { x: 158, y: 65 }, ownerId: null, troopCount: 0 },
  { id: 9, name: "Germany", nameAr: "ألمانيا", path: "M168,50 L195,48 L198,72 L172,75 L168,60 Z", center: { x: 182, y: 60 }, ownerId: null, troopCount: 0 },
  
  // Africa (10-14)
  { id: 10, name: "Egypt", nameAr: "مصر", path: "M175,85 L205,82 L208,105 L178,108 L172,95 Z", center: { x: 190, y: 95 }, ownerId: null, troopCount: 0 },
  { id: 11, name: "Nigeria", nameAr: "نيجيريا", path: "M155,118 L185,115 L190,140 L160,145 L152,132 Z", center: { x: 172, y: 130 }, ownerId: null, troopCount: 0 },
  { id: 12, name: "DR Congo", nameAr: "الكونغو", path: "M175,150 L210,145 L215,185 L180,190 L172,168 Z", center: { x: 192, y: 168 }, ownerId: null, troopCount: 0 },
  { id: 13, name: "South Africa", nameAr: "جنوب أفريقيا", path: "M180,205 L215,200 L220,235 L185,240 L175,220 Z", center: { x: 198, y: 220 }, ownerId: null, troopCount: 0 },
  { id: 14, name: "Madagascar", nameAr: "مدغشقر", path: "M235,200 L248,198 L245,230 L232,228 Z", center: { x: 240, y: 215 }, ownerId: null, troopCount: 0 },
  
  // Asia (15-18)
  { id: 15, name: "Russia", nameAr: "روسيا", path: "M200,15 L300,10 L310,50 L210,55 L195,35 Z", center: { x: 255, y: 32 }, ownerId: null, troopCount: 0 },
  { id: 16, name: "China", nameAr: "الصين", path: "M250,65 L320,58 L325,105 L255,112 L245,85 Z", center: { x: 288, y: 85 }, ownerId: null, troopCount: 0 },
  { id: 17, name: "India", nameAr: "الهند", path: "M235,115 L275,112 L280,155 L245,165 L235,140 Z", center: { x: 258, y: 138 }, ownerId: null, troopCount: 0 },
  { id: 18, name: "Japan", nameAr: "اليابان", path: "M335,75 L355,72 L360,95 L342,100 L335,85 Z", center: { x: 348, y: 85 }, ownerId: null, troopCount: 0 },
  
  // Australia (19)
  { id: 19, name: "Australia", nameAr: "أستراليا", path: "M290,195 L360,188 L370,245 L300,255 L285,220 Z", center: { x: 328, y: 222 }, ownerId: null, troopCount: 0 },
];

// Territory adjacency based on real-world borders
export const INVASION_TERRITORY_ADJACENCY: Record<number, number[]> = {
  // North America
  0: [1],              // Canada → USA
  1: [0, 2],           // USA → Canada, Mexico
  2: [1, 3],           // Mexico → USA, Colombia
  
  // South America  
  3: [2, 4],           // Colombia → Mexico, Brazil
  4: [3, 5, 6],        // Brazil → Colombia, Argentina, Chile
  5: [4, 6],           // Argentina → Brazil, Chile
  6: [4, 5],           // Chile → Brazil, Argentina
  
  // Europe
  7: [8],              // UK → France
  8: [7, 9, 10],       // France → UK, Germany, Egypt (via Med)
  9: [8],              // Germany → France
  
  // Africa
  10: [8, 11],         // Egypt → France (via Med), Nigeria
  11: [10, 12],        // Nigeria → Egypt, DR Congo
  12: [11, 13],        // DR Congo → Nigeria, South Africa
  13: [12, 14],        // South Africa → DR Congo, Madagascar
  14: [13],            // Madagascar → South Africa
  
  // Asia
  15: [9, 16],         // Russia → Germany, China
  16: [15, 17, 18],    // China → Russia, India, Japan
  17: [16],            // India → China
  18: [16, 19],        // Japan → China, Australia (sea route)
  
  // Australia
  19: [18],            // Australia → Japan (sea route)
};

// Get territories based on player count (3 players = 15, 5 players = 20)
export function getInvasionTerritoriesForPlayerCount(playerCount: number): InvasionTerritory[] {
  // Scale: min 12 territories (4 per player), max 20 territories
  const territoryCounts: Record<number, number> = {
    2: 12,   // 6 per player
    3: 15,   // 5 per player
    4: 16,   // 4 per player
    5: 20,   // 4 per player
    6: 20,   // ~3.3 per player
    7: 20,
    8: 20,
  };
  
  const count = territoryCounts[playerCount] || 20;
  return JSON.parse(JSON.stringify(INVASION_TERRITORIES.slice(0, count)));
}

// ─── State ───────────────────────────────────────────────────
interface InvasionInternalState {
  gameId: string;
  territories: InvasionTerritory[];
  playerIds: string[];
  
  // Current round question
  currentQuestion: {
    id: string;
    text: string;
    options: string[];
    correctIndex: number;
    startTime: number;
  } | null;
  
  // Player responses for current question
  playerResponses: Record<string, {
    answer: number;
    responseTimeMs: number;
    isCorrect: boolean;
  }>;
  
  // Ranking after each question
  lastRanking: {
    playerId: string;
    playerName: string;
    rank: number;
    picks: number;
    responseTimeMs: number;
  }[];
  
  // Selection phase
  selectionPhase: {
    isActive: boolean;
    pickingPlayerId: string | null;
    picksRemaining: number;
    turnIndex: number;
    timerHandle: ReturnType<typeof setTimeout> | null;
  };
  
  // Game phase
  phase: "question" | "ranking" | "selection" | "ended";
  currentRound: number;
  totalRounds: number;
}

export const INVASION_GAMES = new Map<string, InvasionInternalState>();
const BASE_TROOPS = 100;
const ATTACK_DAMAGE = 50;
const SELECTION_TIMEOUT_MS = 10000; // 10 seconds per pick

// ─── Public Functions ────────────────────────────────────────

export function createInvasionGame(gameId: string, playerIds: string[]): void {
  // Get scaled territories based on player count
  const territories = getInvasionTerritoriesForPlayerCount(playerIds.length);
  
  // Assign starting territories - spread across the map
  const maxTerritoryId = territories.length - 1;
  const startingIndices = playerIds.map((_, i) => 
    Math.floor((i / playerIds.length) * maxTerritoryId)
  );
  
  playerIds.forEach((playerId, index) => {
    const territoryIdx = startingIndices[index];
    if (territoryIdx < territories.length) {
      territories[territoryIdx].ownerId = playerId;
      territories[territoryIdx].troopCount = BASE_TROOPS;
    }
  });
  
  INVASION_GAMES.set(gameId, {
    gameId,
    territories,
    playerIds,
    currentQuestion: null,
    playerResponses: {},
    lastRanking: [],
    selectionPhase: {
      isActive: false,
      pickingPlayerId: null,
      picksRemaining: 0,
      turnIndex: 0,
      timerHandle: null,
    },
    phase: "question",
    currentRound: 1,
    totalRounds: 10,
  });
}

// Create invasion game from conquest state (Phase 2 transition)
export function createInvasionGameFromConquest(
  gameId: string,
  playerIds: string[],
  playerNames: Record<string, string>,
  conquestTerritories: Record<string, string>, // territoryId -> ownerId
  conquestForts: Record<string, string> // playerId -> territoryId
): void {
  // Get scaled territories based on player count
  const territories = getInvasionTerritoriesForPlayerCount(playerIds.length);
  const totalTerritories = territories.length;
  
  // Map conquest regions to invasion territory ranges (proportional to available territories)
  // Conquest regions: 1=NA, 2=SA, 3=EU, 4=AF, 5=RU, 6=ME, 7=IN, 8=EA, 9=SEA, 10=AU
  const getInvasionIndicesForConquest = (conquestId: string): number[] => {
    // Divide territories proportionally by region importance
    const regionMappings: Record<string, number[]> = {
      "1": [0, 1, 2],           // North America → Canada, USA, Mexico (if available)
      "2": [3, 4, 5, 6],        // South America → Colombia, Brazil, Argentina, Chile
      "3": [7, 8, 9],           // Europe → UK, France, Germany
      "4": [10, 11, 12, 13, 14], // Africa → Egypt, Nigeria, DR Congo, South Africa, Madagascar
      "5": [15],                // Russia → Russia
      "6": [10, 15],            // Middle East → Egypt (closest match)
      "7": [17],                // India → India
      "8": [16, 18],            // East Asia → China, Japan
      "9": [16, 17, 18],        // Southeast Asia → China, India, Japan (proximity)
      "10": [19],               // Australia → Australia
    };
    const candidates = regionMappings[conquestId] || [];
    // Filter to only indices that exist in our scaled territory set
    return candidates.filter(idx => idx < totalTerritories);
  };
  
  // Track which invasion territories are assigned
  const assignedIndices = new Set<number>();
  
  // Assign ownership based on conquest state
  Object.entries(conquestTerritories).forEach(([conquestTid, ownerId]) => {
    if (!ownerId) return;
    const invasionIndices = getInvasionIndicesForConquest(conquestTid);
    // Find first unassigned territory in this region
    for (const idx of invasionIndices) {
      if (!assignedIndices.has(idx)) {
        territories[idx].ownerId = ownerId;
        territories[idx].troopCount = BASE_TROOPS;
        assignedIndices.add(idx);
        break;
      }
    }
  });
  
  // Ensure every player has at least one territory (fallback - spread remaining players)
  playerIds.forEach((playerId) => {
    const hasTerritory = territories.some((t: InvasionTerritory) => t.ownerId === playerId);
    if (!hasTerritory) {
      // Find first unowned territory
      const unownedIdx = territories.findIndex((t: InvasionTerritory, idx: number) => 
        !t.ownerId && !assignedIndices.has(idx)
      );
      if (unownedIdx >= 0) {
        territories[unownedIdx].ownerId = playerId;
        territories[unownedIdx].troopCount = BASE_TROOPS;
        assignedIndices.add(unownedIdx);
      }
    }
  });
  
  INVASION_GAMES.set(gameId, {
    gameId,
    territories,
    playerIds,
    currentQuestion: null,
    playerResponses: {},
    lastRanking: [],
    selectionPhase: {
      isActive: false,
      pickingPlayerId: null,
      picksRemaining: 0,
      turnIndex: 0,
      timerHandle: null,
    },
    phase: "question",
    currentRound: 1,
    totalRounds: 10,
  });
}

export async function startInvasionRound(
  gameId: string,
  io: TypedServer,
  redis: SafeRedis
): Promise<void> {
  const state = INVASION_GAMES.get(gameId);
  if (!state) return;
  
  // Reset for new round
  state.playerResponses = {};
  state.lastRanking = [];
  state.selectionPhase = {
    isActive: false,
    pickingPlayerId: null,
    picksRemaining: 0,
    turnIndex: 0,
    timerHandle: null,
  };
  state.phase = "question";
  
  // Fetch and send question
  const questions = await fetchQuestions(Difficulty.Medium, 1);
  const question = questions[0];
  if (!question) {
    console.error(`[Invasion] No question available for game ${gameId}`);
    return;
  }
  
  state.currentQuestion = {
    id: question.id,
    text: question.text,
    options: question.options,
    correctIndex: question.correctIndex,
    startTime: Date.now(),
  };
  
  // Broadcast question to all players
  io.to(gameId).emit("invasion:roundStart", {
    round: state.currentRound,
    totalRounds: state.totalRounds,
    question: {
      id: question.id,
      text: question.text,
      options: question.options,
      timeLimit: 15, // 15 seconds to answer
    }
  });
  
  // Set timeout for question phase (15 seconds)
  setTimeout(() => {
    processQuestionResults(gameId, io, redis);
  }, 15000);
}

export function recordAnswer(
  gameId: string,
  playerId: string,
  answerIndex: number
): void {
  const state = INVASION_GAMES.get(gameId);
  if (!state || !state.currentQuestion) return;
  
  const responseTimeMs = Date.now() - state.currentQuestion.startTime;
  const isCorrect = answerIndex === state.currentQuestion.correctIndex;
  
  state.playerResponses[playerId] = {
    answer: answerIndex,
    responseTimeMs,
    isCorrect,
  };
}

async function processQuestionResults(
  gameId: string,
  io: TypedServer,
  redis: SafeRedis
): Promise<void> {
  const state = INVASION_GAMES.get(gameId);
  if (!state) return;
  
  // Filter only correct players and sort by response time
  const correctPlayers = Object.entries(state.playerResponses)
    .filter(([_, response]) => response.isCorrect)
    .sort((a, b) => a[1].responseTimeMs - b[1].responseTimeMs);
  
  // Calculate picks based on rank
  const playerCount = state.playerIds.length;
  const ranking = correctPlayers.map(([playerId, response], index) => {
    const rank = index + 1;
    let picks = 1; // Base: everyone gets at least 1 pick
    
    // Bonus picks based on rank and player count
    if (rank === 1) {
      picks = 3; // First place gets 3 picks
    } else if (rank === 2 && playerCount >= 3) {
      picks = 2; // Second place gets 2 picks (if 3+ players)
    } else if (rank === 3 && playerCount >= 5) {
      picks = 2; // Third place gets 2 picks (if 5+ players)
    }
    
    return {
      playerId,
      playerName: playerId, // Would need to look up actual name
      rank,
      picks,
      responseTimeMs: response.responseTimeMs,
    };
  });
  
  state.lastRanking = ranking;
  state.phase = "ranking";
  
  // Broadcast ranking to all players
  io.to(gameId).emit("invasion:ranking", {
    ranking: ranking.map(r => ({
      playerId: r.playerId,
      playerName: r.playerName,
      rank: r.rank,
      picks: r.picks,
      responseTimeMs: r.responseTimeMs,
    })),
  });
  
  // If no correct answers, skip to next round after delay
  if (ranking.length === 0) {
    setTimeout(() => {
      advanceToNextRound(gameId, io, redis);
    }, 3000);
    return;
  }
  
  // Start selection phase after showing ranking
  setTimeout(() => {
    startSelectionPhase(gameId, io, redis);
  }, 3000);
}

function startSelectionPhase(
  gameId: string,
  io: TypedServer,
  redis: SafeRedis
): void {
  const state = INVASION_GAMES.get(gameId);
  if (!state || state.lastRanking.length === 0) return;
  
  state.phase = "selection";
  state.selectionPhase.isActive = true;
  state.selectionPhase.turnIndex = 0;
  
  // Start with first ranked player
  processNextPicker(gameId, io, redis);
}

function processNextPicker(
  gameId: string,
  io: TypedServer,
  redis: SafeRedis
): void {
  const state = INVASION_GAMES.get(gameId);
  if (!state || !state.selectionPhase.isActive) return;
  
  const ranking = state.lastRanking;
  const turnIndex = state.selectionPhase.turnIndex;
  
  // Check if all players have picked
  if (turnIndex >= ranking.length) {
    // End selection phase, move to next round
    endSelectionPhase(gameId, io, redis);
    return;
  }
  
  const currentPicker = ranking[turnIndex];
  
  // Check if this player has picks remaining
  if (currentPicker.picks <= 0) {
    // Move to next player
    state.selectionPhase.turnIndex++;
    processNextPicker(gameId, io, redis);
    return;
  }
  
  // Set current picker
  state.selectionPhase.pickingPlayerId = currentPicker.playerId;
  state.selectionPhase.picksRemaining = currentPicker.picks;
  
  // Notify players whose turn it is
  io.to(gameId).emit("invasion:turn", {
    playerId: currentPicker.playerId,
    playerName: currentPicker.playerName,
    picksRemaining: state.selectionPhase.picksRemaining,
    selectableTerritories: getSelectableTerritories(state, currentPicker.playerId),
    timeLimit: 10,
  });
  
  // Set selection timeout
  state.selectionPhase.timerHandle = setTimeout(() => {
    // Player didn't select in time - consume one pick.
    currentPicker.picks = Math.max(0, currentPicker.picks - 1);
    state.selectionPhase.picksRemaining = currentPicker.picks;
    if (currentPicker.picks <= 0) {
      state.selectionPhase.turnIndex++;
    }
    processNextPicker(gameId, io, redis);
  }, SELECTION_TIMEOUT_MS);
}

function getSelectableTerritories(
  state: InvasionInternalState,
  playerId: string
): number[] {
  // Return territories that can be selected (neutral or owned by others)
  return state.territories
    .filter(t => t.ownerId !== playerId)
    .map(t => t.id);
}

export function selectTerritory(
  gameId: string,
  playerId: string,
  territoryId: number,
  io: TypedServer,
  redis: SafeRedis
): boolean {
  const state = INVASION_GAMES.get(gameId);
  if (!state) return false;
  if (state.phase !== "selection" || !state.selectionPhase.isActive) return false;
  if (!Number.isFinite(territoryId)) return false;
  
  // Validate it's this player's turn
  if (state.selectionPhase.pickingPlayerId !== playerId) {
    return false;
  }
  
  const territory = state.territories.find(t => t.id === territoryId);
  if (!territory) return false;
  
  // Can't select own territory
  if (territory.ownerId === playerId) return false;
  
  // Cancel selection timer
  if (state.selectionPhase.timerHandle) {
    clearTimeout(state.selectionPhase.timerHandle);
    state.selectionPhase.timerHandle = null;
  }
  
  // Process the selection
  if (territory.ownerId === null) {
    // Neutral territory - claim it
    territory.ownerId = playerId;
    territory.troopCount = BASE_TROOPS;
  } else {
    // Owned territory - attack
    territory.troopCount -= ATTACK_DAMAGE;
    
    if (territory.troopCount <= 0) {
      // Conquered!
      territory.ownerId = playerId;
      territory.troopCount = BASE_TROOPS;
    }
  }
  
  // Broadcast territory update
  io.to(gameId).emit("invasion:territoryUpdate", {
    territories: state.territories.map(t => ({
      id: t.id,
      ownerId: t.ownerId,
      troopCount: t.troopCount,
    })),
  });
  
  // Check if player has more picks
  const ranking = state.lastRanking.find(r => r.playerId === playerId);
  if (ranking) {
    ranking.picks = Math.max(0, ranking.picks - 1);
  }
  const picksLeft = ranking?.picks ?? 0;
  state.selectionPhase.picksRemaining = picksLeft;

  if (ranking && picksLeft > 0) {
    // Player has more picks - stay on same player
    setTimeout(() => {
      // Notify players whose turn it is
      io.to(gameId).emit("invasion:turn", {
        playerId: playerId,
        playerName: ranking.playerName,
        picksRemaining: picksLeft,
        selectableTerritories: getSelectableTerritories(state, playerId),
        timeLimit: 10,
      });
      
      // Set new timeout — stay on same player; processNextPicker will check picks
      state.selectionPhase.timerHandle = setTimeout(() => {
        processNextPicker(gameId, io, redis);
      }, SELECTION_TIMEOUT_MS);
    }, 500);
  } else {
    // Move to next player
    state.selectionPhase.turnIndex++;
    setTimeout(() => {
      processNextPicker(gameId, io, redis);
    }, 500);
  }
  
  return true;
}

function endSelectionPhase(
  gameId: string,
  io: TypedServer,
  redis: SafeRedis
): void {
  const state = INVASION_GAMES.get(gameId);
  if (!state) return;
  
  state.selectionPhase.isActive = false;
  state.selectionPhase.pickingPlayerId = null;
  
  // Broadcast updated state
  io.to(gameId).emit("invasion:state", buildClientState(gameId));
  
  // Move to next round
  setTimeout(() => {
    advanceToNextRound(gameId, io, redis);
  }, 2000);
}

function advanceToNextRound(
  gameId: string,
  io: TypedServer,
  redis: SafeRedis
): void {
  const state = INVASION_GAMES.get(gameId);
  if (!state) return;
  
  state.currentRound++;
  
  // Check if game has ended
  if (state.currentRound > state.totalRounds) {
    endInvasionGame(gameId, io);
    return;
  }
  
  // Start next round
  startInvasionRound(gameId, io, redis);
}

function endInvasionGame(gameId: string, io: TypedServer): void {
  const state = INVASION_GAMES.get(gameId);
  if (!state) return;
  
  state.phase = "ended";
  
  // Calculate final scores (territory count per player)
  const scores: Record<string, number> = {};
  state.playerIds.forEach(id => scores[id] = 0);
  
  state.territories.forEach(t => {
    if (t.ownerId) {
      scores[t.ownerId] = (scores[t.ownerId] || 0) + 1;
    }
  });
  
  // Find winner
  const winner = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  
  io.to(gameId).emit("invasion:gameEnd", {
    winnerId: winner ? winner[0] : "",
    winnerName: winner ? winner[0] : "", // Would need to look up actual name
    finalTerritories: scores,
  });
  
  // Cleanup
  INVASION_GAMES.delete(gameId);
}

export function getInvasionState(gameId: string): InvasionInternalState | undefined {
  return INVASION_GAMES.get(gameId);
}

export function deleteInvasionGame(gameId: string): void {
  INVASION_GAMES.delete(gameId);
}

// Build client state for broadcasting
function buildClientState(gameId: string): import("@quiz-battle/shared").InvasionClientState {
  const state = INVASION_GAMES.get(gameId);
  if (!state) {
    return {
      territories: [],
      currentRound: 0,
      totalRounds: 0,
      phase: 'ended',
      currentQuestion: null,
      lastRanking: [],
      selectionPhase: {
        isActive: false,
        pickingPlayerId: null,
        picksRemaining: 0,
        turnIndex: 0,
      },
    };
  }

  return {
    territories: state.territories.map(t => ({
      id: t.id.toString(),
      ownerId: t.ownerId,
      troopCount: t.troopCount,
    })),
    currentRound: state.currentRound,
    totalRounds: state.totalRounds,
    phase: state.phase,
    currentQuestion: state.currentQuestion ? {
      id: state.currentQuestion.id,
      text: state.currentQuestion.text,
      options: state.currentQuestion.options,
      timeLimit: 15,
    } : null,
    lastRanking: state.lastRanking,
    selectionPhase: {
      isActive: state.selectionPhase.isActive,
      pickingPlayerId: state.selectionPhase.pickingPlayerId,
      picksRemaining: state.selectionPhase.picksRemaining,
      turnIndex: state.selectionPhase.turnIndex,
    },
  };
}

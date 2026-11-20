import { Server } from "socket.io";
import { Difficulty, ServerToClientEvents, ClientToServerEvents, CONQUEST_TERRITORIES } from "@quiz-battle/shared";
import { fetchQuestions } from "./questions";
import { getBotInfo } from "./aiBots";

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

export interface ConquestAnswerStats {
  correctAnswers: number;
  totalAnswers: number;
  totalResponseTimeMs: number;
}

export interface InvasionCompletion {
  gameId: string;
  playerIds: string[];
  playerNames: Record<string, string>;
  scores: Record<string, number>;
  totalRounds: number;
  answerStats?: Record<string, ConquestAnswerStats>;
}
let completionHandler: ((io: TypedServer, completed: InvasionCompletion) => Promise<void>) | undefined;

// The room orchestrator owns participant identity and durable finalization.
// Registering a callback keeps this module independent of its parent module.
export function registerInvasionCompletionHandler(
  handler: (io: TypedServer, completed: InvasionCompletion) => Promise<void>
): void {
  completionHandler = handler;
}

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
// SHARED TERRITORIES — 20 countries with schematic SVG geometry
// Scales based on player count: 3 players → 15 territories, 5 players → 20
// ═══════════════════════════════════════════════════════════════════════════════

export const INVASION_TERRITORIES: InvasionTerritory[] = CONQUEST_TERRITORIES.map((territory) => ({
  id: territory.id,
  name: territory.name,
  nameAr: territory.nameAr,
  path: territory.path,
  center: { ...territory.center },
  ownerId: null,
  troopCount: 0,
}));

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
  playerNames: Record<string, string>;
  difficulty: Difficulty;
  language: "en" | "ar";
  categories?: string[];
  answerStats: Record<string, ConquestAnswerStats>;
  
  // Current round question
  currentQuestion: {
    id: string;
    text: string;
    options: string[];
    correctIndex: number;
    startTime: number;
    timeLimit: number;
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
  roundStarting: boolean;
  questionTimer: ReturnType<typeof setTimeout> | null;
  phaseTimer: ReturnType<typeof setTimeout> | null;
  botTimers: Set<ReturnType<typeof setTimeout>>;
}

export const INVASION_GAMES = new Map<string, InvasionInternalState>();
const BASE_TROOPS = 100;
const ATTACK_DAMAGE = 50;
const SELECTION_TIMEOUT_MS = 10000; // 10 seconds per pick

function clearBotTimers(state: InvasionInternalState): void {
  state.botTimers.forEach(clearTimeout);
  state.botTimers.clear();
}

function scheduleBotTask(state: InvasionInternalState, delay: number, action: () => void): void {
  const timer = setTimeout(() => {
    state.botTimers.delete(timer);
    if (INVASION_GAMES.get(state.gameId) === state) action();
  }, delay);
  state.botTimers.add(timer);
}

// ─── Public Functions ────────────────────────────────────────

export interface InvasionOptions {
  difficulty?: Difficulty;
  language?: "en" | "ar";
  categories?: string[];
  totalRounds?: number;
  playerNames?: Record<string, string>;
  answerStats?: Record<string, ConquestAnswerStats>;
}

function copyAnswerStats(playerIds: string[], initial?: Record<string, ConquestAnswerStats>): Record<string, ConquestAnswerStats> {
  return Object.fromEntries(playerIds.map(playerId => [playerId, {
    correctAnswers: initial?.[playerId]?.correctAnswers ?? 0,
    totalAnswers: initial?.[playerId]?.totalAnswers ?? 0,
    totalResponseTimeMs: initial?.[playerId]?.totalResponseTimeMs ?? 0,
  }]));
}

export function createInvasionGame(gameId: string, playerIds: string[], options: InvasionOptions = {}): void {
  if (INVASION_GAMES.has(gameId)) return;
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
    playerNames: options.playerNames || {},
    difficulty: options.difficulty || Difficulty.Medium,
    language: options.language || "en",
    categories: options.categories,
    answerStats: copyAnswerStats(playerIds, options.answerStats),
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
    totalRounds: options.totalRounds || 10,
    roundStarting: false,
    questionTimer: null,
    phaseTimer: null,
    botTimers: new Set(),
  });
}

// Create invasion game from conquest state (Phase 2 transition)
export function createInvasionGameFromConquest(
  gameId: string,
  playerIds: string[],
  playerNames: Record<string, string>,
  conquestTerritories: Record<string, string>, // territoryId -> ownerId
  conquestForts: Record<string, string>, // playerId -> territoryId
  options: InvasionOptions = {}
): void {
  if (INVASION_GAMES.has(gameId)) return;
  // Get scaled territories based on player count
  const territories = getInvasionTerritoriesForPlayerCount(playerIds.length);
  // Both phases use the same country ids. Preserve the drafted map exactly.
  for (const territory of territories) {
    const ownerId = conquestTerritories[String(territory.id)];
    if (ownerId && playerIds.includes(ownerId)) {
      territory.ownerId = ownerId;
      territory.troopCount = BASE_TROOPS;
    }
  }
  
  // Ensure every player has at least one territory (fallback - spread remaining players)
  playerIds.forEach((playerId) => {
    const hasTerritory = territories.some((t: InvasionTerritory) => t.ownerId === playerId);
    if (!hasTerritory) {
      // Find first unowned territory
      const unownedIdx = territories.findIndex(t => !t.ownerId);
      if (unownedIdx >= 0) {
        territories[unownedIdx].ownerId = playerId;
        territories[unownedIdx].troopCount = BASE_TROOPS;
      }
    }
  });
  
  INVASION_GAMES.set(gameId, {
    gameId,
    territories,
    playerIds,
    playerNames,
    difficulty: options.difficulty || Difficulty.Medium,
    language: options.language || "en",
    categories: options.categories,
    answerStats: copyAnswerStats(playerIds, options.answerStats),
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
    totalRounds: options.totalRounds || 10,
    roundStarting: false,
    questionTimer: null,
    phaseTimer: null,
    botTimers: new Set(),
  });
}

export async function startInvasionRound(
  gameId: string,
  io: TypedServer
): Promise<void> {
  const state = INVASION_GAMES.get(gameId);
  if (!state || state.phase !== "question" || state.currentQuestion || state.roundStarting) return;
  // Claim startup before the fetch so simultaneous client requests are idempotent.
  state.roundStarting = true;
  
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
  let questions: Awaited<ReturnType<typeof fetchQuestions>>;
  try {
    questions = await fetchQuestions(state.difficulty, 1, state.categories, undefined, state.language, gameId, { singleChoiceOnly: true });
  } finally {
    state.roundStarting = false;
  }
  if (INVASION_GAMES.get(gameId) !== state || state.phase !== "question") return;
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
    timeLimit: question.timeLimit,
  };

  for (const playerId of state.playerIds) {
    const bot = getBotInfo(playerId);
    if (!bot) continue;
    const ranges = { easy: [5000, 10000], medium: [3000, 7000], hard: [1000, 4000] };
    const [min, max] = ranges[bot.difficulty];
    const delay = Math.max(0, Math.min(question.timeLimit * 1000 - 1, min + Math.floor(Math.random() * (max - min))));
    const currentQuestion = state.currentQuestion;
    scheduleBotTask(state, delay, () => {
      if (state.currentQuestion !== currentQuestion) return;
      const accuracy = { easy: 0.42, medium: 0.62, hard: 0.82 };
      const answer = Math.random() < accuracy[bot.difficulty] ? question.correctIndex : Math.floor(Math.random() * question.options.length);
      recordAnswer(gameId, playerId, answer);
    });
  }
  
  // Broadcast question to all players
  io.to(gameId).emit("invasion:roundStart", {
    serverNow: Date.now(),
    questionStartedAt: state.currentQuestion.startTime,
    round: state.currentRound,
    totalRounds: state.totalRounds,
    question: {
      id: question.id,
      text: question.text,
      options: question.options,
      timeLimit: question.timeLimit,
    }
  });
  
  // Use the question's configured deadline for both display and validation.
  state.questionTimer = setTimeout(() => {
    if (INVASION_GAMES.get(gameId) !== state || state.phase !== "question") return;
    state.questionTimer = null;
    processQuestionResults(gameId, io);
  }, question.timeLimit * 1000);
}

export function recordAnswer(
  gameId: string,
  playerId: string,
  answerIndex: number
): void {
  const state = INVASION_GAMES.get(gameId);
  if (!state || state.phase !== "question" || !state.currentQuestion) return;
  if (!state.playerIds.includes(playerId) || Object.prototype.hasOwnProperty.call(state.playerResponses, playerId)) return;
  if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= state.currentQuestion.options.length) return;
  
  const responseTimeMs = Date.now() - state.currentQuestion.startTime;
  if (responseTimeMs < 0 || responseTimeMs >= state.currentQuestion.timeLimit * 1000) return;
  const isCorrect = answerIndex === state.currentQuestion.correctIndex;
  
  state.playerResponses[playerId] = {
    answer: answerIndex,
    responseTimeMs,
    isCorrect,
  };
  const stats = state.answerStats[playerId];
  stats.totalAnswers++;
  if (isCorrect) stats.correctAnswers++;
  stats.totalResponseTimeMs += responseTimeMs;
}

async function processQuestionResults(
  gameId: string,
  io: TypedServer
): Promise<void> {
  const state = INVASION_GAMES.get(gameId);
  if (!state || state.phase !== "question") return;
  clearBotTimers(state);
  
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
      playerName: state.playerNames[playerId] || playerId,
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
    state.phaseTimer = setTimeout(() => {
      if (INVASION_GAMES.get(gameId) !== state || state.phase !== "ranking") return;
      state.phaseTimer = null;
      advanceToNextRound(gameId, io);
    }, 3000);
    return;
  }
  
  // Start selection phase after showing ranking
  state.phaseTimer = setTimeout(() => {
    if (INVASION_GAMES.get(gameId) !== state || state.phase !== "ranking") return;
    state.phaseTimer = null;
    startSelectionPhase(gameId, io);
  }, 3000);
}

function startSelectionPhase(
  gameId: string,
  io: TypedServer
): void {
  const state = INVASION_GAMES.get(gameId);
  if (!state || state.phase !== "ranking" || state.lastRanking.length === 0) return;
  
  state.phase = "selection";
  state.selectionPhase.isActive = true;
  state.selectionPhase.turnIndex = 0;
  
  // Start with first ranked player
  processNextPicker(gameId, io);
}

function processNextPicker(
  gameId: string,
  io: TypedServer
): void {
  const state = INVASION_GAMES.get(gameId);
  if (!state || state.phase !== "selection" || !state.selectionPhase.isActive) return;
  clearBotTimers(state);
  if (state.selectionPhase.timerHandle) clearTimeout(state.selectionPhase.timerHandle);
  state.selectionPhase.timerHandle = null;
  
  const ranking = state.lastRanking;
  const turnIndex = state.selectionPhase.turnIndex;
  
  // Check if all players have picked
  if (turnIndex >= ranking.length) {
    // End selection phase, move to next round
    endSelectionPhase(gameId, io);
    return;
  }
  
  const currentPicker = ranking[turnIndex];
  
  // Check if this player has picks remaining
  if (currentPicker.picks <= 0 || getSelectableTerritories(state, currentPicker.playerId).length === 0) {
    currentPicker.picks = 0;
    // Move to next player
    state.selectionPhase.turnIndex++;
    processNextPicker(gameId, io);
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
    if (INVASION_GAMES.get(gameId) !== state || state.phase !== "selection") return;
    state.selectionPhase.timerHandle = null;
    // Player didn't select in time - consume one pick.
    currentPicker.picks = Math.max(0, currentPicker.picks - 1);
    state.selectionPhase.picksRemaining = currentPicker.picks;
    if (currentPicker.picks <= 0) {
      state.selectionPhase.turnIndex++;
    }
    processNextPicker(gameId, io);
  }, SELECTION_TIMEOUT_MS);

  if (getBotInfo(currentPicker.playerId)) {
    const picksRemaining = currentPicker.picks;
    scheduleBotTask(state, 800 + Math.floor(Math.random() * 1200), () => {
      if (state.phase !== "selection" || state.selectionPhase.pickingPlayerId !== currentPicker.playerId || currentPicker.picks !== picksRemaining) return;
      const available = getSelectableTerritories(state, currentPicker.playerId);
      const target = available[Math.floor(Math.random() * available.length)];
      if (target !== undefined) selectTerritory(gameId, currentPicker.playerId, target, io);
    });
  }
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
  io: TypedServer
): boolean {
  const state = INVASION_GAMES.get(gameId);
  if (!state) return false;
  if (state.phase !== "selection" || !state.selectionPhase.isActive) return false;
  if (!Number.isInteger(territoryId)) return false;
  const ranking = state.lastRanking[state.selectionPhase.turnIndex];
  if (!ranking || ranking.playerId !== playerId || ranking.picks <= 0) return false;
  
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
  ranking.picks = Math.max(0, ranking.picks - 1);
  const picksLeft = ranking.picks;
  state.selectionPhase.picksRemaining = picksLeft;

  if (picksLeft <= 0) {
    state.selectionPhase.turnIndex++;
  }
  // Advance synchronously: an exhausted player must not keep a 500ms write window.
  processNextPicker(gameId, io);
  
  return true;
}

function endSelectionPhase(
  gameId: string,
  io: TypedServer
): void {
  const state = INVASION_GAMES.get(gameId);
  if (!state) return;
  
  state.selectionPhase.isActive = false;
  state.selectionPhase.pickingPlayerId = null;
  state.selectionPhase.picksRemaining = 0;
  
  // Broadcast updated state
  io.to(gameId).emit("invasion:state", buildInvasionClientState(gameId));
  
  // Move to next round
  state.phaseTimer = setTimeout(() => {
    if (INVASION_GAMES.get(gameId) !== state || state.phase !== "selection") return;
    state.phaseTimer = null;
    advanceToNextRound(gameId, io);
  }, 2000);
}

function advanceToNextRound(
  gameId: string,
  io: TypedServer
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
  state.currentQuestion = null;
  state.phase = "question";
  startInvasionRound(gameId, io).catch(err => {
    console.error(`[Invasion] Round start failed for ${gameId}:`, err);
    io.to(gameId).emit("game:error", { message: "Unable to start invasion round" });
  });
}

function endInvasionGame(gameId: string, io: TypedServer): void {
  const state = INVASION_GAMES.get(gameId);
  if (!state || state.phase === "ended") return;
  
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
  
  const finalize = async () => {
    try {
      await completionHandler?.(io, {
        gameId, playerIds: [...state.playerIds], playerNames: { ...state.playerNames },
        scores, totalRounds: state.totalRounds,
        answerStats: copyAnswerStats(state.playerIds, state.answerStats),
      });
    } catch (error) {
      console.error("[Invasion] Results finalization failed:", error);
      io.to(gameId).emit("game:error", { message: "Unable to finalize invasion results" });
    }
    io.to(gameId).emit("invasion:gameEnd", {
      winnerId: winner ? winner[0] : "",
      winnerName: winner ? state.playerNames[winner[0]] || winner[0] : "",
      finalTerritories: scores,
    });
    if (INVASION_GAMES.get(gameId) === state) deleteInvasionGame(gameId);
  };
  void finalize();
}

export function getInvasionState(gameId: string): InvasionInternalState | undefined {
  return INVASION_GAMES.get(gameId);
}

export function deleteInvasionGame(gameId: string): void {
  const state = INVASION_GAMES.get(gameId);
  if (state) clearBotTimers(state);
  if (state?.questionTimer) clearTimeout(state.questionTimer);
  if (state?.phaseTimer) clearTimeout(state.phaseTimer);
  if (state?.selectionPhase.timerHandle) clearTimeout(state.selectionPhase.timerHandle);
  INVASION_GAMES.delete(gameId);
}

// Build client state for broadcasting
export function buildInvasionClientState(gameId: string, viewerId?: string): import("@quiz-battle/shared").InvasionClientState {
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
    serverNow: Date.now(),
    territories: state.territories.map(t => ({
      ...t,
      id: t.id.toString(),
    })),
    currentRound: state.currentRound,
    totalRounds: state.totalRounds,
    phase: state.phase,
    questionStartedAt: state.currentQuestion?.startTime,
    currentTurn: state.selectionPhase.pickingPlayerId,
    picksRemaining: state.selectionPhase.picksRemaining,
    selectableTerritories: state.selectionPhase.isActive && state.selectionPhase.pickingPlayerId
      ? getSelectableTerritories(state, state.selectionPhase.pickingPlayerId)
      : [],
    ...(viewerId ? {
      selectedAnswer: state.playerResponses[viewerId]?.answer ?? null,
      answeredAt: state.playerResponses[viewerId]
        ? (state.currentQuestion?.startTime ?? 0) + state.playerResponses[viewerId].responseTimeMs
        : null,
    } : {}),
    currentQuestion: state.currentQuestion ? {
      id: state.currentQuestion.id,
      text: state.currentQuestion.text,
      options: state.currentQuestion.options,
      timeLimit: state.currentQuestion.timeLimit,
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

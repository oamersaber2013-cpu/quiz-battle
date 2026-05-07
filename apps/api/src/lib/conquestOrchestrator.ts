import { Server } from "socket.io";
import type { SafeRedis } from "./redis";
import { Difficulty, ServerToClientEvents, ClientToServerEvents, ConquestClientState } from "@quiz-battle/shared";
import { fetchQuestions } from "./questions";
import { 
  WORLD_TERRITORIES, 
  getTerritoriesForPlayerCount as getWorldMapTerritories,
  getFortIdsForPlayerCount,
  WorldTerritory 
} from "./worldMapData";
import { 
  createInvasionGameFromConquest,
  INVASION_TERRITORIES,
  getInvasionTerritoriesForPlayerCount,
  InvasionTerritory
} from "./invasionOrchestrator";

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

// Conquest now uses real-world invasion territories
export const CONQUEST_TERRITORIES = INVASION_TERRITORIES;

// ─── State ────────────────────────────────────────────────────
interface ConquestInternalState {
  gameId: string;
  territories: Record<string, string | null>; // territoryId -> ownerId | null
  fortHealth: Record<string, number>; // playerId -> health
  fortTerritoryId: Record<string, string>; // playerId -> territoryId
  activeTerritoryIds: string[]; // Currently active territories based on player count
  turnOrder: string[];
  currentTurnIndex: number;
  phase: "draft" | "draft_selection" | "select_target" | "battle" | "rebuild" | "ended";
  eliminatedPlayers: string[];
  
  // DRAFT PHASE (Splitting the world)
  draftPhase: {
    currentRound: number;
    question: { id: string; text: string; options: string[]; timeLimit: number; correctIndex: number } | null;
    answers: Map<string, { answer: number; responseTimeMs: number }>; // playerId -> answer
    picksRemaining: Map<string, number>; // playerId -> picks remaining this round
    pickOrder: string[]; // Order of players for picking
    currentPickerIndex: number;
    availableTerritories: string[]; // Unclaimed territory IDs
    timerHandle: ReturnType<typeof setTimeout> | null;
  } | null;
  
  currentBattle: {
    attackerId: string;
    defenderId: string;
    targetTerritoryId: string;
    isAttackingFort: boolean;
    question: { id: string; text: string; options: string[]; timeLimit: number; correctIndex: number };
    attackerAnswer: number | null;
    defenderAnswer: number | null;
    consecutiveCorrect: number;
    selectedCategory?: string;
    timerHandle: ReturnType<typeof setTimeout> | null;
  } | null;
  rebuildSession: {
    playerId: string;
    question: { id: string; text: string; options: string[]; timeLimit: number; correctIndex: number };
    timerHandle: ReturnType<typeof setTimeout> | null;
  } | null;
  difficulty: Difficulty;
  language: "en" | "ar";
  categories?: string[];
  playerNames: Record<string, string>;
}

const games = new Map<string, ConquestInternalState>();

// ─── Helpers ─────────────────────────────────────────────────
function activePlayers(s: ConquestInternalState): string[] {
  return s.turnOrder.filter(p => !s.eliminatedPlayers.includes(p));
}
function currentPlayer(s: ConquestInternalState): string {
  const active = activePlayers(s);
  return active[s.currentTurnIndex % active.length];
}
export function safeConquestState(s: ConquestInternalState): ConquestClientState {
  return {
    territories: s.territories,
    fortHealth: s.fortHealth,
    fortTerritoryId: s.fortTerritoryId,
    turnOrder: s.turnOrder,
    currentTurnIndex: s.currentTurnIndex,
    phase: s.phase,
    eliminatedPlayers: s.eliminatedPlayers,
    draftPhase: s.draftPhase ? {
      currentRound: s.draftPhase.currentRound,
      question: s.draftPhase.question ? {
        id: s.draftPhase.question.id,
        text: s.draftPhase.question.text,
        options: s.draftPhase.question.options,
        timeLimit: s.draftPhase.question.timeLimit,
      } : null,
      answered: s.draftPhase.answers.size,
      totalPlayers: s.turnOrder.length,
      pickOrder: s.draftPhase.pickOrder,
      currentPickerIndex: s.draftPhase.currentPickerIndex,
      availableTerritories: s.draftPhase.availableTerritories,
      picksRemaining: Object.fromEntries(s.draftPhase.picksRemaining),
    } : null,
    currentBattle: s.currentBattle ? {
      attackerId: s.currentBattle.attackerId,
      defenderId: s.currentBattle.defenderId,
      targetTerritoryId: s.currentBattle.targetTerritoryId,
      isAttackingFort: s.currentBattle.isAttackingFort,
      question: {
        id: s.currentBattle.question.id,
        text: s.currentBattle.question.text,
        options: s.currentBattle.question.options,
        timeLimit: s.currentBattle.question.timeLimit,
      },
      attackerAnswered: s.currentBattle.attackerAnswer !== null,
      defenderAnswered: s.currentBattle.defenderAnswer !== null,
      consecutiveCorrect: s.currentBattle.consecutiveCorrect,
    } : null,
    rebuildSession: s.rebuildSession ? {
      playerId: s.rebuildSession.playerId,
      question: {
        id: s.rebuildSession.question.id,
        text: s.rebuildSession.question.text,
        options: s.rebuildSession.question.options,
        timeLimit: s.rebuildSession.question.timeLimit,
      },
      answered: false,
    } : null,
  };
}

export function getConquestState(gameId: string): ConquestInternalState | undefined {
  return games.get(gameId);
}

function emit(io: TypedServer, s: ConquestInternalState) {
  io.to(s.gameId).emit("conquest:state", safeConquestState(s));
}

// ─── Init ────────────────────────────────────────────────────
export async function initConquestGame(
  io: TypedServer,
  gameId: string,
  playerIds: string[],
  playerNames: Record<string, string>,
  difficulty: Difficulty,
  language: "en" | "ar",
  categories?: string[]
): Promise<void> {
  // Get scaled real-world territories based on player count
  const playerCount = playerIds.length;
  const activeTerritories = getInvasionTerritoriesForPlayerCount(playerCount);
  const activeTerritoryIds = activeTerritories.map(t => String(t.id));
  
  // Initialize empty territories (all unclaimed - forts assigned randomly)
  const territories: Record<string, string | null> = {};
  activeTerritoryIds.forEach(id => territories[id] = null);
  
  // Assign forts randomly to spread players across the map
  const shuffledIds = [...activeTerritoryIds].sort(() => Math.random() - 0.5);
  const fortTerritoryId: Record<string, string> = {};
  const fortHealth: Record<string, number> = {};
  
  playerIds.forEach((pid, index) => {
    const fortId = shuffledIds[index % shuffledIds.length];
    fortTerritoryId[pid] = fortId;
    territories[fortId] = pid; // Fort is pre-claimed
    fortHealth[pid] = 3; // 3 fort layers
  });

  // Initialize draft phase with only active territories
  const draftPhase = {
    currentRound: 0,
    question: null as { id: string; text: string; options: string[]; timeLimit: number; correctIndex: number } | null,
    answers: new Map<string, { answer: number; responseTimeMs: number }>(),
    picksRemaining: new Map<string, number>(),
    pickOrder: [] as string[],
    currentPickerIndex: 0,
    availableTerritories: [...activeTerritoryIds], // Copy of active territories
    timerHandle: null as ReturnType<typeof setTimeout> | null,
  };

  const state: ConquestInternalState = {
    gameId, territories, fortHealth, fortTerritoryId,
    activeTerritoryIds,
    turnOrder: [...playerIds],
    currentTurnIndex: 0,
    phase: "draft", // Start with draft phase
    eliminatedPlayers: [],
    draftPhase,
    currentBattle: null,
    rebuildSession: null,
    difficulty, language, categories,
    playerNames,
  };

  games.set(gameId, state);
  emit(io, state);
  
  // Start the first draft round
  await startDraftRound(io, gameId);
}

function startTurn(io: TypedServer, s: ConquestInternalState) {
  const active = activePlayers(s);
  if (active.length <= 1) { endGame(io, s); return; }

  s.phase = "select_target";
  s.currentBattle = null;
  s.rebuildSession = null;

  const pid = currentPlayer(s);
  io.to(s.gameId).emit("conquest:turnStart", {
    playerId: pid,
    playerName: s.playerNames[pid] || pid,
  });
  emit(io, s);
}

// ─── Attack ──────────────────────────────────────────────────
export async function handleAttack(
  io: TypedServer,
  gameId: string,
  attackerId: string,
  targetTerritoryId: string,
  categoryId?: string
): Promise<{ success: boolean; error?: string }> {
  const s = games.get(gameId);
  if (!s) return { success: false, error: "Game not found" };
  if (s.phase !== "select_target") return { success: false, error: "Not your time to attack" };
  if (currentPlayer(s) !== attackerId) return { success: false, error: "Not your turn" };

  // Validate target territory is in active territories
  if (!s.activeTerritoryIds.includes(targetTerritoryId)) {
    return { success: false, error: "Invalid target territory" };
  }

  const defenderId = s.territories[targetTerritoryId];
  if (!defenderId || defenderId === attackerId) return { success: false, error: "Invalid target" };

  const isAttackingFort = s.fortTerritoryId[defenderId] === targetTerritoryId;

  // Attacker chooses category - if not provided, use random from game categories
  const randomCategory =
    s.categories && s.categories.length > 0
      ? s.categories[Math.floor(Math.random() * s.categories.length)]
      : undefined;
  const selectedCategory = categoryId || randomCategory;
  const categoriesToUse = selectedCategory ? [selectedCategory] : s.categories;

  const qs = await fetchQuestions(s.difficulty, 1, categoriesToUse, undefined, s.language);
  const q = qs[0];
  if (!q) return { success: false, error: "No question available" };

  s.phase = "battle";
  s.currentBattle = {
    attackerId, defenderId, targetTerritoryId, isAttackingFort,
    question: { id: q.id, text: q.text, options: q.options, timeLimit: q.timeLimit, correctIndex: q.correctIndex },
    attackerAnswer: null, defenderAnswer: null, consecutiveCorrect: 0,
    selectedCategory,
    timerHandle: setTimeout(() => timeoutBattle(io, gameId), (q.timeLimit + 3) * 1000),
  };

  emit(io, s);
  return { success: true };
}

function timeoutBattle(io: TypedServer, gameId: string) {
  const s = games.get(gameId);
  if (!s || s.phase !== "battle" || !s.currentBattle) return;
  // Unanswered = wrong
  if (s.currentBattle.attackerAnswer === null) s.currentBattle.attackerAnswer = -1;
  if (s.currentBattle.defenderAnswer === null) s.currentBattle.defenderAnswer = -1;
  resolveDuel(io, s);
}

export function handleDuelAnswer(io: TypedServer, gameId: string, playerId: string, answerIndex: number) {
  const s = games.get(gameId);
  if (!s || s.phase !== "battle" || !s.currentBattle) return;
  const b = s.currentBattle;
  if (playerId === b.attackerId && b.attackerAnswer === null) b.attackerAnswer = answerIndex;
  else if (playerId === b.defenderId && b.defenderAnswer === null) b.defenderAnswer = answerIndex;
  else return;
  if (b.attackerAnswer !== null && b.defenderAnswer !== null) resolveDuel(io, s);
}

async function resolveDuel(io: TypedServer, s: ConquestInternalState) {
  if (!s.currentBattle) return;
  const b = s.currentBattle;
  if (b.timerHandle) clearTimeout(b.timerHandle);

  const correct = b.question.correctIndex;
  const aCorrect = b.attackerAnswer === correct;
  const dCorrect = b.defenderAnswer === correct;

  if (aCorrect && dCorrect) {
    // Tie-breaker: fetch next question
    b.consecutiveCorrect++;
    b.attackerAnswer = null;
    b.defenderAnswer = null;

    io.to(s.gameId).emit("conquest:duelResult", {
      attackerWon: false, attackerCorrect: true, defenderCorrect: true,
      correctIndex: correct, tieBreaker: true,
    });

    const qs = await fetchQuestions(s.difficulty, 1, s.categories, undefined, s.language);
    const q = qs[0];
    if (!q) { dCorrect && resolveDuel(io, s); return; }

    b.question = { id: q.id, text: q.text, options: q.options, timeLimit: q.timeLimit, correctIndex: q.correctIndex };
    b.timerHandle = setTimeout(() => timeoutBattle(io, s.gameId), (q.timeLimit + 3) * 1000);
    emit(io, s);
    return;
  }

  const attackerWon = aCorrect && !dCorrect;
  let capturedTerritoryId: string | undefined;
  let fortDamage: number | undefined;
  let eliminatedPlayerId: string | undefined;

  if (attackerWon) {
    if (b.isAttackingFort) {
      // Damage fort
      s.fortHealth[b.defenderId] = Math.max(0, (s.fortHealth[b.defenderId] || 1) - 1);
      fortDamage = 1;
      if (s.fortHealth[b.defenderId] === 0) {
        // Fort destroyed — eliminate player
        eliminatedPlayerId = b.defenderId;
        // Transfer all their territories to attacker
        Object.entries(s.territories).forEach(([tid, owner]) => {
          if (owner === b.defenderId) s.territories[tid] = b.attackerId;
        });
        s.eliminatedPlayers.push(b.defenderId);
      }
    } else {
      // Capture territory
      s.territories[b.targetTerritoryId] = b.attackerId;
      capturedTerritoryId = b.targetTerritoryId;
      // Check if defender now has no territories
      const defenderHasTerritory = Object.values(s.territories).some(o => o === b.defenderId);
      if (!defenderHasTerritory) {
        eliminatedPlayerId = b.defenderId;
        s.eliminatedPlayers.push(b.defenderId);
      }
    }
  }

  io.to(s.gameId).emit("conquest:duelResult", {
    attackerWon, attackerCorrect: aCorrect, defenderCorrect: dCorrect,
    correctIndex: correct, capturedTerritoryId, fortDamage, eliminatedPlayerId,
  });

  s.currentBattle = null;
  // Advance turn
  const active = activePlayers(s);
  if (active.length <= 1) { endGame(io, s); return; }
  s.currentTurnIndex = (s.currentTurnIndex + 1) % active.length;
  emit(io, s);
  setTimeout(() => startTurn(io, s), 3000);
}

// ─── Rebuild ─────────────────────────────────────────────────
export async function handleRebuild(
  io: TypedServer, gameId: string, playerId: string
): Promise<{ success: boolean; error?: string }> {
  const s = games.get(gameId);
  if (!s) return { success: false, error: "Game not found" };
  if (s.phase !== "select_target") return { success: false, error: "Cannot rebuild now" };
  if (currentPlayer(s) !== playerId) return { success: false, error: "Not your turn" };
  if ((s.fortHealth[playerId] || 0) >= 3) return { success: false, error: "Fort already at full health" };

  const qs = await fetchQuestions(s.difficulty, 1, s.categories, undefined, s.language);
  const q = qs[0];
  if (!q) return { success: false, error: "No question" };

  s.phase = "rebuild";
  s.rebuildSession = {
    playerId, question: { id: q.id, text: q.text, options: q.options, timeLimit: q.timeLimit, correctIndex: q.correctIndex },
    timerHandle: setTimeout(() => {
      const gs = games.get(gameId);
      if (gs?.phase === "rebuild" && gs.rebuildSession?.playerId === playerId) {
        handleRebuildAnswer(io, gameId, playerId, -1);
      }
    }, (q.timeLimit + 3) * 1000),
  };
  emit(io, s);
  return { success: true };
}

export function handleRebuildAnswer(io: TypedServer, gameId: string, playerId: string, answerIndex: number) {
  const s = games.get(gameId);
  if (!s || s.phase !== "rebuild" || !s.rebuildSession || s.rebuildSession.playerId !== playerId) return;
  const r = s.rebuildSession;
  if (r.timerHandle) clearTimeout(r.timerHandle);

  const correct = r.question.correctIndex;
  const success = answerIndex === correct;
  const newHealth = success ? Math.min(3, (s.fortHealth[playerId] || 0) + 1) : (s.fortHealth[playerId] || 0);
  if (success) s.fortHealth[playerId] = newHealth;

  io.to(s.gameId).emit("conquest:rebuildResult", {
    playerId, success, correctIndex: correct, newHealth,
  });

  s.rebuildSession = null;
  // Advance turn after rebuild
  const active = activePlayers(s);
  s.currentTurnIndex = (s.currentTurnIndex + 1) % active.length;
  emit(io, s);
  setTimeout(() => startTurn(io, s), 2000);
}

// ─── End ─────────────────────────────────────────────────────
function endGame(io: TypedServer, s: ConquestInternalState) {
  s.phase = "ended";
  emit(io, s);
}

export function removeConquestGame(gameId: string) {
  games.delete(gameId);
}

// ─── DRAFT PHASE (Splitting the World) ───────────────────────

export async function startDraftRound(
  io: TypedServer,
  gameId: string
): Promise<void> {
  const s = games.get(gameId);
  if (!s || !s.draftPhase) return;

  const questions = await fetchQuestions(s.difficulty, 1, s.categories, undefined, s.language);
  const q = questions[0];
  if (!q) return;

  // Clear previous round data
  s.draftPhase.question = {
    id: q.id,
    text: q.text,
    options: q.options,
    timeLimit: q.timeLimit,
    correctIndex: q.correctIndex
  };
  s.draftPhase.answers.clear();
  s.draftPhase.picksRemaining.clear();
  s.draftPhase.pickOrder = [];
  s.draftPhase.currentPickerIndex = 0;
  s.draftPhase.currentRound++;

  s.phase = "draft";

  // Broadcast question to all players
  io.to(gameId).emit("conquest:draftQuestion", {
    round: s.draftPhase.currentRound,
    question: {
      id: q.id,
      text: q.text,
      options: q.options,
      timeLimit: q.timeLimit
    }
  });

  // Set timer for round end (question time + 3s buffer)
  s.draftPhase.timerHandle = setTimeout(() => {
    processDraftRound(io, gameId);
  }, (q.timeLimit + 3) * 1000);

  emit(io, s);
}

export function recordDraftAnswer(
  gameId: string,
  playerId: string,
  answerIndex: number,
  responseTimeMs: number
): { success: boolean; error?: string } {
  const s = games.get(gameId);
  if (!s || s.phase !== "draft" || !s.draftPhase) {
    return { success: false, error: "Not in draft phase" };
  }

  if (s.draftPhase.answers.has(playerId)) {
    return { success: false, error: "Already answered" };
  }

  s.draftPhase.answers.set(playerId, { answer: answerIndex, responseTimeMs });
  return { success: true };
}

export async function processDraftRound(
  io: TypedServer,
  gameId: string
): Promise<void> {
  const s = games.get(gameId);
  if (!s || !s.draftPhase) return;

  const q = s.draftPhase.question;
  if (!q) return;

  // Calculate rankings: correct + fast answers first
  const playerIds = s.turnOrder;
  const results = playerIds.map(pid => {
    const ans = s.draftPhase!.answers.get(pid);
    return {
      playerId: pid,
      playerName: s.playerNames[pid] || pid,
      correct: ans ? ans.answer === q.correctIndex : false,
      responseTimeMs: ans ? ans.responseTimeMs : Infinity
    };
  });

  // Sort: correct first (by response time), then incorrect (by how close)
  results.sort((a, b) => {
    if (a.correct && !b.correct) return -1;
    if (!a.correct && b.correct) return 1;
    if (a.correct && b.correct) return a.responseTimeMs - b.responseTimeMs;
    // For incorrect, sort by proximity to correct answer
    const distA = Math.abs((a.correct ? 0 : a.responseTimeMs) - q.correctIndex);
    const distB = Math.abs((b.correct ? 0 : b.responseTimeMs) - q.correctIndex);
    return distA - distB;
  });

  // Assign picks based on rank
  // 1st: 3 picks, 2nd: 1 pick, 3rd+: 0 picks
  const ranking = results.map((r, index) => {
    const rank = index + 1;
    let picks = 0;
    if (rank === 1) picks = 3;
    else if (rank === 2) picks = 1;

    if (picks > 0) {
      s.draftPhase!.picksRemaining.set(r.playerId, picks);
    }

    return {
      playerId: r.playerId,
      playerName: r.playerName,
      rank,
      picks,
      correct: r.correct,
      responseTimeMs: r.responseTimeMs === Infinity ? null : r.responseTimeMs
    };
  });

  // Build pick order: players with picks go in rank order
  s.draftPhase.pickOrder = ranking
    .filter(r => r.picks > 0)
    .map(r => r.playerId);

  s.draftPhase.currentPickerIndex = 0;
  s.phase = "draft_selection";

  // Broadcast results
  io.to(gameId).emit("conquest:draftRanking", {
    round: s.draftPhase.currentRound,
    ranking,
    pickOrder: s.draftPhase.pickOrder.map(pid => ({
      playerId: pid,
      playerName: s.playerNames[pid] || pid,
      picksRemaining: s.draftPhase!.picksRemaining.get(pid) || 0
    }))
  });

  // Start first picker
  startNextPick(io, s);
  emit(io, s);
}

function startNextPick(io: TypedServer, s: ConquestInternalState): void {
  if (!s.draftPhase) return;

  const pickOrder = s.draftPhase.pickOrder;
  const currentIndex = s.draftPhase.currentPickerIndex;

  if (currentIndex >= pickOrder.length) {
    // All picks done for this round
    checkDraftComplete(io, s);
    return;
  }

  const currentPicker = pickOrder[currentIndex];
  const picksRemaining = s.draftPhase.picksRemaining.get(currentPicker) || 0;

  if (picksRemaining <= 0) {
    // This player has no more picks, move to next
    s.draftPhase.currentPickerIndex++;
    startNextPick(io, s);
    return;
  }

  // Notify whose turn to pick
  io.to(s.gameId).emit("conquest:draftPickTurn", {
    playerId: currentPicker,
    playerName: s.playerNames[currentPicker] || currentPicker,
    picksRemaining,
    availableTerritories: s.draftPhase.availableTerritories
  });

  // Set timeout for pick (10 seconds)
  if (s.draftPhase.timerHandle) clearTimeout(s.draftPhase.timerHandle);
  s.draftPhase.timerHandle = setTimeout(() => {
    // Auto-skip if timeout
    skipDraftPick(io, s.gameId);
  }, 10000);

  emit(io, s);
}

export function selectDraftTerritory(
  io: TypedServer,
  gameId: string,
  playerId: string,
  territoryId: string
): { success: boolean; error?: string } {
  const s = games.get(gameId);
  if (!s || s.phase !== "draft_selection" || !s.draftPhase) {
    return { success: false, error: "Not draft selection phase" };
  }

  // Check if it's this player's turn
  const pickOrder = s.draftPhase.pickOrder;
  const currentIndex = s.draftPhase.currentPickerIndex;
  if (currentIndex >= pickOrder.length || pickOrder[currentIndex] !== playerId) {
    return { success: false, error: "Not your turn to pick" };
  }

  // Check if territory is available
  const available = s.draftPhase.availableTerritories;
  if (!available.includes(territoryId)) {
    return { success: false, error: "Territory not available" };
  }

  // Claim the territory
  s.territories[territoryId] = playerId;
  s.fortHealth[playerId] = (s.fortHealth[playerId] || 0) + 1;
  if (!s.fortTerritoryId[playerId]) {
    s.fortTerritoryId[playerId] = territoryId; // First pick is fort
  }

  // Remove from available
  s.draftPhase.availableTerritories = available.filter(id => id !== territoryId);

  // Decrement picks remaining
  const currentPicks = s.draftPhase.picksRemaining.get(playerId) || 0;
  s.draftPhase.picksRemaining.set(playerId, currentPicks - 1);

  // Broadcast territory claimed
  io.to(gameId).emit("conquest:territoryClaimed", {
    territoryId,
    playerId,
    playerName: s.playerNames[playerId] || playerId,
    isFort: !s.fortTerritoryId[playerId] || s.fortTerritoryId[playerId] === territoryId
  });

  // Check if player has more picks
  const picksLeft = s.draftPhase.picksRemaining.get(playerId) || 0;
  if (picksLeft <= 0) {
    // Move to next player
    s.draftPhase.currentPickerIndex++;
  }

  // Continue picking
  startNextPick(io, s);
  emit(io, s);

  return { success: true };
}

function skipDraftPick(io: TypedServer, gameId: string): void {
  const s = games.get(gameId);
  if (!s || !s.draftPhase) return;

  // Move to next picker
  s.draftPhase.currentPickerIndex++;
  startNextPick(io, s);
  emit(io, s);
}

function checkDraftComplete(io: TypedServer, s: ConquestInternalState): void {
  if (!s.draftPhase) return;

  // Check if all territories are claimed
  if (s.draftPhase.availableTerritories.length === 0) {
    // Draft complete - move to invasion phase
    if (s.draftPhase.timerHandle) clearTimeout(s.draftPhase.timerHandle);
    s.draftPhase = null;
    s.phase = "ended"; // Conquest phase ends, invasion takes over

    const playerIds = activePlayers(s);
    
    // Initialize invasion mode with transferred territories
    createInvasionGameFromConquest(
      s.gameId,
      playerIds,
      s.playerNames,
      s.territories as Record<string, string>, // Filter out nulls via type assertion
      s.fortTerritoryId
    );

    // Notify clients that invasion phase is starting
    io.to(s.gameId).emit("conquest:draftComplete", {
      territories: s.territories,
      playerTerritories: buildPlayerTerritories(s),
    });

    // Emit invasion:init to trigger frontend transition
    io.to(s.gameId).emit("invasion:init", {
      gameId: s.gameId,
      playerIds,
    });

    emit(io, s);
    return;
  }

  // Start next round
  startDraftRound(io, s.gameId);
}

function buildPlayerTerritories(s: ConquestInternalState): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const [tid, owner] of Object.entries(s.territories)) {
    if (owner) {
      if (!result[owner]) result[owner] = [];
      result[owner].push(tid);
    }
  }
  return result;
}

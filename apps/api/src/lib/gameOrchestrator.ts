import { Server, Socket } from "socket.io";
import { initConquestGame } from "./conquestOrchestrator";
import type { SafeRedis } from "../lib/redis";
import {
  GameMode,
  GameStatus,
  PlayerState,
  PowerUpType,
  GAME_MODE_CONFIG,
  ServerToClientEvents,
  ClientToServerEvents,
  getRandomQuote,
} from "@quiz-battle/shared";
import { KEYS, getRoomState, setRoomState } from "../lib/redis";
import { prisma } from "@quiz-battle/db";
import { fetchQuestions, applyFiftyFifty, computePowerUpEffect, clearUsedQuestions } from "../lib/questions";
import {
  calculateScoreDelta,
  isTimingValid,
  applyWholePowerUp,
  applyStealPowerUp,
  computeFinalResults,
  checkSurvivalEliminations,
} from "../lib/scoring";
import { fillWithBots, removeBots, getBotInfo } from "../lib/aiBots";
import { recordAnswer } from "./antiCheat";
import { trackEvent } from "./analytics";

function roastPlayer(io: TypedServer, gameId: string, type: "right" | "wrong", username: string, language: "en" | "ar") {
  const quote = getRandomQuote(type);
  const message = quote[language].replace("u", username).replace("you", username);
  
  io.to(gameId).emit("game:message", {
    userId: "system",
    username: "System",
    message,
    timestamp: Date.now(),
  });
}

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

interface GameState {
  gameId: string;
  joinCode: string;
  hostId: string;
  mode: GameMode;
  difficulty: import("@quiz-battle/shared").Difficulty;
  status: GameStatus;
  players: Record<string, PlayerState>;
  questions: Array<import("@quiz-battle/shared").ClientQuestion & { correctIndex: number }>;
  currentRound: number;
  totalRounds: number;
  maxPlayers: number;
  questionStartTime: number;
  answersThisRound: Record<string, { index: number; timestamp: number; latencyMs: number }>;
  lastAnswerByPlayer: Record<string, boolean>; // for WHOLE power-up
  activeEffects: import("@quiz-battle/shared").ActivePowerUpEffect[];
  categories?: string[];
  subcategories?: string[];
  language: 'en' | 'ar';
  // Conquest mode
  territories?: Record<string, string | null>; // territory id -> team/player id
  playerTerritories?: Record<string, string[]>; // playerId -> territory ids
}

// Map of active game states in memory (for this worker)
const activeGames = new Map<string, GameState>();
const FREEZE_DURATION_MS = 5000;
const SANDSTORM_DURATION_MS = 7000;
const TIME_WARP_BONUS_MS = 5000;
const STARTER_POWER_UPS: PowerUpType[] = [
  PowerUpType.FiftyFifty,
  PowerUpType.Shield,
  PowerUpType.Freeze,
  PowerUpType.DoubleDown,
  PowerUpType.Sandstorm,
  PowerUpType.TimeWarp,
];

export function getActiveGame(gameId: string): GameState | undefined {
  return activeGames.get(gameId);
}

export function getAllActiveGames(): GameState[] {
  return Array.from(activeGames.values());
}

export function setActiveGame(gameId: string, state: GameState): void {
  activeGames.set(gameId, state);
}

export function removeActiveGame(gameId: string): void {
  activeGames.delete(gameId);
  clearUsedQuestions(gameId); // Clean up question tracking
}

// ─── Game Lifecycle ─────────────────────────────────────────

export async function startGame(
  io: TypedServer,
  redis: SafeRedis,
  gameId: string
): Promise<void> {
  const game = activeGames.get(gameId);
  if (!game) return;

  // Track game start
  await trackEvent("game_started", game.hostId, { gameId, mode: game.mode, difficulty: game.difficulty });

  // Update status
  game.status = GameStatus.Countdown;
  
  // Clear used questions for this game
  clearUsedQuestions(gameId);
  
  game.questions = await fetchQuestions(
    game.difficulty, 
    game.totalRounds, 
    game.categories, 
    game.subcategories, 
    game.language,
    gameId  // Pass gameId to track used questions
  );



  if (game.mode === GameMode.Conquest) {
    // Initialize 10 territories (matching the new world map)
    game.territories = {};
    game.playerTerritories = {};
    const playerIds = Object.keys(game.players);
    
    for (let i = 1; i <= 10; i++) {
      const territoryId = String(i);
      // Distribute territories evenly
      const ownerId = playerIds[(i - 1) % playerIds.length];
      game.territories[territoryId] = ownerId;
      if (!game.playerTerritories[ownerId]) game.playerTerritories[ownerId] = [];
      game.playerTerritories[ownerId].push(territoryId);
    }
  }

  // Give each player starter power-ups ONLY if the mode allows it
  const modeConfig = GAME_MODE_CONFIG[game.mode];
  if (modeConfig.hasPowerUps) {
    Object.values(game.players).forEach((p) => {
      p.powerUpInventory = [...STARTER_POWER_UPS];
    });
  } else {
    Object.values(game.players).forEach((p) => {
      p.powerUpInventory = [];
    });
  }

  await syncToRedis(redis, game);

  // Countdown
  io.to(gameId).emit("game:countdown", { seconds: 5 });
  await sleep(5000);

  // Begin rounds
  await runRounds(io, redis, game);
}

async function runRounds(
  io: TypedServer,
  redis: SafeRedis,
  game: GameState
): Promise<void> {
  for (let i = 0; i < game.questions.length; i++) {
    const activePlayers = Object.values(game.players).filter((p) => !p.isEliminated && p.isConnected);
    if (activePlayers.length < 1) break;

    game.currentRound = i + 1;
    game.status = GameStatus.Question;
    game.answersThisRound = {};
    game.activeEffects = [];

    const q = game.questions[i];
    game.questionStartTime = Date.now();

    await syncToRedis(redis, game);

    // Send question to all (without correctIndex)
    const { correctIndex, ...clientQuestion } = q;
    


    io.to(game.gameId).emit("game:question", {
      question: clientQuestion,
      round: game.currentRound,
      totalRounds: game.totalRounds,
    });

    // Schedule bot answers
    const botPlayers = Object.values(game.players).filter(
      (p) => p.isBot && !p.isEliminated
    );
    for (const bot of botPlayers) {
      const botInfo = getBotInfo(bot.userId);
      const botDifficulty = botInfo?.difficulty || "medium";
      const accuracy = { easy: 0.42, medium: 0.62, hard: 0.82 };
      const responseRanges = {
        easy: { min: 5000, max: 10000 },
        medium: { min: 3000, max: 7000 },
        hard: { min: 1000, max: 4000 },
      };
      const range = responseRanges[botDifficulty];
      const responseTime = Math.floor(Math.random() * (range.max - range.min) + range.min);
      const isCorrect = Math.random() < accuracy[botDifficulty];

      // Bot uses powerup occasionally
      const powerupChance = botDifficulty === "hard" ? 0.35 : (botDifficulty === "medium" ? 0.15 : 0.05);
      if (bot.powerUpInventory.length > 0 && Math.random() < powerupChance) {
        const powerup = bot.powerUpInventory[Math.floor(Math.random() * bot.powerUpInventory.length)];
        let targetUserId: string | undefined = undefined;
        
        if (requiresTarget(powerup)) {
          // Target player with highest score
          const target = Object.values(game.players)
            .filter(p => !p.isEliminated && p.userId !== bot.userId)
            .sort((a,b) => b.score - a.score)[0];
          if (target) targetUserId = target.userId;
        }

        if (!requiresTarget(powerup) || targetUserId) {
          setTimeout(() => {
            if (!game.answersThisRound[bot.userId]) {
              handlePowerUp(game, io, redis, bot.userId, powerup, targetUserId);
            }
          }, responseTime * 0.4); // use powerup before answering
        }
      }

      setTimeout(() => {
        if (game.answersThisRound[bot.userId]) return; // Already answered
        const answerIndex = isCorrect
          ? q.correctIndex
          : [0, 1, 2, 3].filter((i) => i !== q.correctIndex)[Math.floor(Math.random() * 3)];
        
        const latencyMs = responseTime;
        const scoreDelta = calculateScoreDelta({
          isCorrect,
          difficulty: game.difficulty,
          timeLimit: clientQuestion.timeLimit,
          latencyMs,
          hasDoubleDown: false,
        });

        game.players[bot.userId].score += scoreDelta;
        if (isCorrect) {
          game.players[bot.userId].streak = (game.players[bot.userId].streak || 0) + 1;
        } else {
          game.players[bot.userId].streak = 0;
        }

        game.answersThisRound[bot.userId] = {
          index: answerIndex,
          timestamp: game.questionStartTime + responseTime,
          latencyMs,
        };
        game.lastAnswerByPlayer[bot.userId] = isCorrect;
      }, responseTime);
    }

    // Wait for the default timer, plus any personal Time Warp extension.
    while (true) {
      const now = Date.now();
      const pendingPlayers = Object.values(game.players).filter((player) => {
        if (player.isEliminated || !player.isConnected) return false;
        if (game.answersThisRound[player.userId]) return false;
        return now < getPlayerAnswerDeadline(game, player.userId, q);
      });

      if (pendingPlayers.length === 0) {
        if (Object.keys(game.answersThisRound).length > 0) {
          await sleep(500);
        }
        break;
      }

      await sleep(200);
    }

    // Reveal answer and update scores
    await revealAnswers(io, redis, game, q.id, q.correctIndex);

    // Update scoreboard
    game.status = GameStatus.AnswerReveal;
    await syncToRedis(redis, game);

    const sortedPlayers = Object.values(game.players).sort((a, b) => b.score - a.score);
    io.to(game.gameId).emit("game:scoreboard", { players: sortedPlayers });

    // Survival: eliminate wrong answerers
    if (game.mode === GameMode.Survival) {
      const wrongUsers = Object.values(game.players)
        .filter((p) => {
          const ans = game.answersThisRound[p.userId];
          return !ans || ans.index !== correctIndex;
        })
        .map((p) => p.userId);

      const wrongUsersWithoutActiveShield = wrongUsers.filter((uid) => !consumeActiveShield(game, uid));
      const toEliminate = checkSurvivalEliminations(
        game.players,
        wrongUsersWithoutActiveShield,
        game.mode
      );
      for (const uid of toEliminate) {
        game.players[uid].isEliminated = true;
        io.to(game.gameId).emit("game:playerEliminated", {
          userId: uid,
          reason: "Wrong answer in Survival mode",
        });
      }
    }

    await sleep(3000); // time to view scoreboard
  }

  await endGame(io, redis, game);
}

async function revealAnswers(
  io: TypedServer,
  _redis: SafeRedis,
  game: GameState,
  _questionId: string,
  correctIndex: number
): Promise<void> {
  // Calculate individual scores first
  const currentQuestion = game.questions[game.currentRound - 1];

  Object.values(game.players).forEach((player) => {
    const answer = game.answersThisRound[player.userId];
    const isCorrect = answer?.index === correctIndex;
    game.lastAnswerByPlayer[player.userId] = isCorrect;

    const hasDoubleDown = game.activeEffects.some(
      (e) => e.type === PowerUpType.DoubleDown && e.sourceUserId === player.userId
    );

    const delta = answer
      ? calculateScoreDelta({
          isCorrect,
          difficulty: game.difficulty,
          timeLimit: currentQuestion ? getEffectiveTimeLimitMs(game, player.userId, currentQuestion) / 1000 : 25,
          latencyMs: answer.latencyMs,
          hasDoubleDown,
        })
      : 0;

    player.score = Math.max(0, player.score + delta);
    if (isCorrect) player.streak++;
    else player.streak = 0;

    // Conquest mode: Capture logic (Overanswer)
    if (game.mode === GameMode.Conquest && game.territories && game.playerTerritories) {
      // In each round, the current territory (Round index) is contested
      const territoryId = String(((game.currentRound - 1) % 10) + 1);
      const currentOwnerId = game.territories[territoryId];

      // If you are NOT the owner, you are correct, and the owner is WRONG (or you are faster)
      if (isCorrect && currentOwnerId !== player.userId) {
        const ownerAnswer = currentOwnerId
          ? game.answersThisRound[currentOwnerId]
          : undefined;
        const ownerIsCorrect = ownerAnswer?.index === correctIndex;

        // If owner is wrong OR you were faster than the owner
        if (!ownerIsCorrect || (answer && ownerAnswer && answer.latencyMs < ownerAnswer.latencyMs)) {
          // CAPTURE! — guard against uninitialized playerTerritories
          game.territories[territoryId] = player.userId;
          if (!game.playerTerritories[player.userId]) {
            game.playerTerritories[player.userId] = [];
          }
          game.playerTerritories[player.userId].push(territoryId);
          if (currentOwnerId) {
            game.playerTerritories[currentOwnerId] = (game.playerTerritories[currentOwnerId] || []).filter(id => id !== territoryId);
          }

          io.to(game.gameId).emit("game:territoryCaptured", {
            territoryId,
            capturedBy: player.userId,
            playerName: player.username,
          });

          // Emit updated territory state immediately on capture
          io.to(game.gameId).emit("game:territoryState", {
            territories: game.territories,
            playerTerritories: game.playerTerritories,
          });
        }
      }
    }

    io.to(game.gameId).emit("game:answerResult", {
      userId: player.userId,
      correct: isCorrect,
      scoreDelta: delta,
      newScore: player.score,
      correctIndex,
    });
  });

  // ROAST ONE RANDOM WRONG ANSWERER
  const wrongAnswerers = Object.values(game.players).filter(p => {
    const ans = game.answersThisRound[p.userId];
    return !ans || ans.index !== correctIndex;
  });
  if (wrongAnswerers.length > 0) {
    const victim = wrongAnswerers[Math.floor(Math.random() * wrongAnswerers.length)];
    roastPlayer(io, game.gameId, "wrong", victim.username, game.language);
  }



  // Conquest mode: emit territory state
  if (game.mode === GameMode.Conquest && game.territories && game.playerTerritories) {
    io.to(game.gameId).emit("game:territoryState", {
      territories: game.territories,
      playerTerritories: game.playerTerritories,
    });
  }
}

async function endGame(
  io: TypedServer,
  redis: SafeRedis,
  game: GameState
): Promise<void> {
  game.status = GameStatus.Ended;

  // Track game completion
  await trackEvent("game_completed", game.hostId, { gameId: game.gameId, mode: game.mode });

  // Build answer history for XP computation
  const answerHistory = new Map<string, Array<{ userId: string; answerIndex: number; timestamp: number; isCorrect: boolean; scoreDelta: number; latencyMs: number }>>();
  Object.values(game.players).forEach((p) => {
    answerHistory.set(p.userId, []);
  });

  const results = computeFinalResults(game.players, answerHistory, game.difficulty);

  io.to(game.gameId).emit("game:end", {
    results,
    xpAwarded: results[0]?.xpEarned ?? 0,
  });

  // Clean up active games after 30s
  setTimeout(() => {
    removeActiveGame(game.gameId);
  }, 30000);
}

// ─── Player Answer Handler ───────────────────────────────────

export async function handlePlayerAnswer(
  game: GameState,
  io: TypedServer,
  redis: SafeRedis,
  userId: string,
  questionId: string,
  answerIndex: number,
  clientTimestamp: number
): Promise<void> {
  const q = game.questions[game.currentRound - 1];
  if (!q || q.id !== questionId) return;

  // Anti-cheat: reject duplicate answers
  if (game.answersThisRound[userId]) return;

  // Freeze blocks answer submission while active.
  if (isPlayerFrozen(game, userId)) return;

  // Anti-cheat: validate timing
  if (!isTimingValid(clientTimestamp, game.questionStartTime, getEffectiveTimeLimitMs(game, userId, q))) return;

  const latencyMs = Date.now() - game.questionStartTime;
  const isCorrect = answerIndex === q.correctIndex;
  
  // Record answer for anti-cheat analysis
  recordAnswer({
    userId,
    questionId,
    answerTime: latencyMs,
    correct: isCorrect,
    timestamp: Date.now(),
  });
  
  game.answersThisRound[userId] = { index: answerIndex, timestamp: clientTimestamp, latencyMs };
}

// ─── Power-Up Handler ────────────────────────────────────────

export async function handlePowerUp(
  game: GameState,
  io: TypedServer,
  redis: SafeRedis,
  userId: string,
  type: PowerUpType,
  targetUserId?: string
): Promise<{ success: boolean; error?: string }> {
  const player = game.players[userId];
  if (!player) return { success: false, error: "Player not found" };
  if (game.status !== GameStatus.Question) {
    return { success: false, error: "Power-ups can only be used during a question" };
  }
  if (player.isEliminated) {
    return { success: false, error: "Eliminated players cannot use power-ups" };
  }

  const idx = player.powerUpInventory.indexOf(type);
  if (idx === -1) return { success: false, error: "Power-up not in inventory" };

  if (requiresTarget(type)) {
    if (!targetUserId) return { success: false, error: "Choose a target first" };
    if (targetUserId === userId) return { success: false, error: "You cannot target yourself" };
    if (!game.players[targetUserId]) return { success: false, error: "Target not found" };
    if (game.players[targetUserId].isEliminated) {
      return { success: false, error: "Target is already eliminated" };
    }
  }

  // Consume the power-up
  player.powerUpInventory.splice(idx, 1);

  const effect = computePowerUpEffect(
    type,
    userId,
    targetUserId,
    getPowerUpExpiry(game, type)
  );
  game.activeEffects.push(effect);

  // Apply immediate effects
  switch (type) {
    case PowerUpType.FiftyFifty: {
      const q = game.questions[game.currentRound - 1];
      if (q) {
        const { eliminatedIndices } = applyFiftyFifty(q.options, q.correctIndex);
        io.to(game.gameId).emit("game:powerUpApplied", {
          ...effect,
          eliminatedIndices,
        } as typeof effect & { eliminatedIndices: number[] });
      }
      break;
    }
    case PowerUpType.Freeze:
    case PowerUpType.Sandstorm:
    case PowerUpType.TimeWarp:
    case PowerUpType.Shield: {
      io.to(game.gameId).emit("game:powerUpApplied", effect);
      break;
    }
    case PowerUpType.Steal: {
      if (targetUserId) {
        game.players = applyStealPowerUp(game.players, userId, targetUserId);
        io.to(game.gameId).emit("game:powerUpApplied", effect);
      }
      break;
    }
    case PowerUpType.Whole: {
      if (targetUserId) {
        const targetLastCorrect = game.lastAnswerByPlayer[targetUserId] ?? false;
        const { deductFromTarget, bonus } = applyWholePowerUp(game.players, userId, targetLastCorrect);
        if (deductFromTarget && game.players[targetUserId]) {
          game.players[targetUserId].score = Math.max(0, game.players[targetUserId].score - 200);
        }
        if (bonus > 0) player.score += bonus;
        io.to(game.gameId).emit("game:powerUpApplied", effect);
      }
      break;
    }
    default:
      io.to(game.gameId).emit("game:powerUpApplied", effect);
  }

  await syncToRedis(redis, game);
  return { success: true };
}

// ─── Helpers ─────────────────────────────────────────────────

async function syncToRedis(redis: SafeRedis, game: GameState): Promise<void> {
  // Store only non-sensitive state (no correctIndex) in Redis
  const { questions: _q, ...rest } = game;
  await setRoomState(redis, game.gameId, rest as Record<string, unknown>);
}

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

function requiresTarget(type: PowerUpType): boolean {
  return [
    PowerUpType.Freeze,
    PowerUpType.Sandstorm,
    PowerUpType.Steal,
    PowerUpType.Whole,
  ].includes(type);
}

function isEffectActive(effect: import("@quiz-battle/shared").ActivePowerUpEffect): boolean {
  return !effect.expiresAt || effect.expiresAt > Date.now();
}

function getPlayerAnswerDeadline(
  game: GameState,
  userId: string,
  question: GameState["questions"][number]
): number {
  const defaultDeadline = game.questionStartTime + question.timeLimit * 1000;
  const timeWarpDeadline = game.activeEffects
    .filter(
      (effect) =>
        effect.type === PowerUpType.TimeWarp &&
        effect.sourceUserId === userId &&
        isEffectActive(effect)
    )
    .reduce((latest, effect) => Math.max(latest, effect.expiresAt ?? latest), defaultDeadline);

  return Math.max(defaultDeadline, timeWarpDeadline);
}

function getEffectiveTimeLimitMs(
  game: GameState,
  userId: string,
  question: GameState["questions"][number]
): number {
  return getPlayerAnswerDeadline(game, userId, question) - game.questionStartTime;
}

function isPlayerFrozen(game: GameState, userId: string): boolean {
  return game.activeEffects.some(
    (effect) =>
      effect.type === PowerUpType.Freeze &&
      effect.targetUserId === userId &&
      isEffectActive(effect)
  );
}

function consumeActiveShield(game: GameState, userId: string): boolean {
  const shieldIndex = game.activeEffects.findIndex(
    (effect) =>
      effect.type === PowerUpType.Shield &&
      effect.sourceUserId === userId &&
      isEffectActive(effect)
  );

  if (shieldIndex === -1) return false;
  game.activeEffects.splice(shieldIndex, 1);
  return true;
}

function getPowerUpExpiry(game: GameState, type: PowerUpType): number | undefined {
  const question = game.questions[game.currentRound - 1];
  const questionDeadline = question
    ? game.questionStartTime + question.timeLimit * 1000
    : undefined;

  switch (type) {
    case PowerUpType.Shield:
      return questionDeadline;
    case PowerUpType.Freeze:
      return Date.now() + FREEZE_DURATION_MS;
    case PowerUpType.Sandstorm:
      return Date.now() + SANDSTORM_DURATION_MS;
    case PowerUpType.TimeWarp:
      return questionDeadline
        ? questionDeadline + TIME_WARP_BONUS_MS
        : Date.now() + TIME_WARP_BONUS_MS;
    default:
      return undefined;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PowerUp Selection Phase
// Players choose their powerups before the game starts
// ═══════════════════════════════════════════════════════════════════════════════

const POWERUP_SELECTION_TIME_MS = 30000; // 30 seconds to choose
const MAX_POWERUP_SELECTIONS = 3; // Each player can pick 3 powerups

interface PowerUpSelectionState {
  selections: Record<string, PowerUpType[]>; // userId -> selected powerups
  confirmed: Set<string>; // users who confirmed their selection
  timerHandle: ReturnType<typeof setTimeout> | null;
}

const powerUpSelections = new Map<string, PowerUpSelectionState>(); // gameId -> selection state

// Store io reference for powerup selection phase
const ioRef = new Map<string, TypedServer>();
const redisRef = new Map<string, SafeRedis>();

export function startPowerUpSelectionPhase(io: TypedServer, redis: SafeRedis, gameId: string): void {
  const game = activeGames.get(gameId);
  if (!game) return;

  // Store io reference
  ioRef.set(gameId, io);
  redisRef.set(gameId, redis);

  // Initialize selection state
  const selectionState: PowerUpSelectionState = {
    selections: {},
    confirmed: new Set(),
    timerHandle: null,
  };

  // Initialize empty selections for all players
  Object.keys(game.players).forEach((userId) => {
    selectionState.selections[userId] = [];
  });

  powerUpSelections.set(gameId, selectionState);

  // Set game status
  game.status = GameStatus.PowerUpSelect;

  // Notify all players
  io.to(gameId).emit("game:powerUpSelectStart", {
    availablePowerUps: STARTER_POWER_UPS,
    maxSelections: MAX_POWERUP_SELECTIONS,
    timeLimit: POWERUP_SELECTION_TIME_MS / 1000,
  });

  // Start timer
  selectionState.timerHandle = setTimeout(() => {
    const storedIo = ioRef.get(gameId);
    const storedRedis = redisRef.get(gameId);
    if (storedIo && storedRedis) {
      finalizePowerUpSelection(storedIo, gameId, storedRedis);
    }
  }, POWERUP_SELECTION_TIME_MS);

  console.log(`[PowerUp Selection] Started for game ${gameId}`);
}

export function handlePowerUpSelection(
  gameId: string,
  userId: string,
  powerUp: PowerUpType
): { success: boolean; error?: string; remainingSlots?: number } {
  const game = activeGames.get(gameId);
  if (!game) return { success: false, error: "Game not found" };
  if (game.status !== GameStatus.PowerUpSelect) {
    return { success: false, error: "Not in powerup selection phase" };
  }

  const selectionState = powerUpSelections.get(gameId);
  if (!selectionState) return { success: false, error: "Selection state not found" };

  // Check if powerup is valid
  if (!STARTER_POWER_UPS.includes(powerUp)) {
    return { success: false, error: "Invalid powerup" };
  }

  const currentSelections = selectionState.selections[userId] || [];

  // Check if already selected this powerup (toggle off)
  const existingIndex = currentSelections.indexOf(powerUp);
  if (existingIndex !== -1) {
    currentSelections.splice(existingIndex, 1);
    selectionState.selections[userId] = currentSelections;
    return { success: true, remainingSlots: MAX_POWERUP_SELECTIONS - currentSelections.length };
  }

  // Check if max selections reached
  if (currentSelections.length >= MAX_POWERUP_SELECTIONS) {
    return { success: false, error: `Maximum ${MAX_POWERUP_SELECTIONS} powerups allowed` };
  }

  // Add powerup
  currentSelections.push(powerUp);
  selectionState.selections[userId] = currentSelections;

  // Notify all players about this selection
  const storedIo = ioRef.get(gameId);
  if (storedIo) {
    storedIo.to(gameId).emit("game:powerUpSelected", {
      userId,
      powerUp,
      remainingSlots: MAX_POWERUP_SELECTIONS - currentSelections.length,
    });
  }

  return { success: true, remainingSlots: MAX_POWERUP_SELECTIONS - currentSelections.length };
}

export function confirmPowerUpSelection(
  io: TypedServer,
  redis: SafeRedis,
  gameId: string,
  userId: string
): { success: boolean; error?: string } {
  const game = activeGames.get(gameId);
  if (!game) return { success: false, error: "Game not found" };
  if (game.status !== GameStatus.PowerUpSelect) {
    return { success: false, error: "Not in powerup selection phase" };
  }

  const selectionState = powerUpSelections.get(gameId);
  if (!selectionState) return { success: false, error: "Selection state not found" };

  // Mark player as confirmed
  selectionState.confirmed.add(userId);

  // Check if all players confirmed
  const allPlayers = Object.keys(game.players);
  const allConfirmed = allPlayers.every((pid) => selectionState.confirmed.has(pid));

  if (allConfirmed) {
    // Cancel timer and finalize
    if (selectionState.timerHandle) {
      clearTimeout(selectionState.timerHandle);
    }
    finalizePowerUpSelection(io, gameId, redis);
  }

  return { success: true };
}

function finalizePowerUpSelection(
  io: TypedServer,
  gameId: string,
  redis: SafeRedis
): void {
  const game = activeGames.get(gameId);
  if (!game) return;

  const selectionState = powerUpSelections.get(gameId);
  if (!selectionState) return;

  // Assign default powerups to players who didn't select
  Object.keys(game.players).forEach((userId) => {
    const selections = selectionState.selections[userId] || [];
    if (selections.length === 0) {
      // Assign random default powerups
      const defaults = [PowerUpType.FiftyFifty, PowerUpType.Shield, PowerUpType.Freeze];
      selectionState.selections[userId] = defaults;
    }
    // Assign to player inventory
    game.players[userId].powerUpInventory = selectionState.selections[userId];
  });

  // Notify all players of final selections
  io.to(gameId).emit("game:powerUpSelectEnd", {
    selections: selectionState.selections,
  });

  // Clean up
  powerUpSelections.delete(gameId);
  ioRef.delete(gameId);
  redisRef.delete(gameId);

  // Start the actual game
  console.log(`[PowerUp Selection] Finalized for game ${gameId}, starting game...`);
  
  if (game.mode === GameMode.Conquest) {
    const playerIds = Object.keys(game.players);
    const playerNames: Record<string, string> = {};
    playerIds.forEach((pid) => {
      playerNames[pid] = game.players[pid].username;
    });
    game.status = GameStatus.Question;
    initConquestGame(
      io,
      gameId,
      playerIds,
      playerNames,
      game.difficulty,
      game.language,
      game.categories
    ).catch(console.error);
  } else {
    startGame(io, redis, gameId).catch(console.error);
  }

  // Broadcast state change to all clients
  const updatedGame = activeGames.get(gameId);
  if (updatedGame) {
    const { questions: _q, ...safeState } = updatedGame;
    io.to(gameId).emit("game:stateSync", {
      room: {
        ...safeState,
        category: updatedGame.categories?.join(", "),
        players: Object.values(safeState.players),
      },
    });
  }
}

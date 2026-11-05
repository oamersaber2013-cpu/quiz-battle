import { Server, Socket } from "socket.io";
import { initConquestGame } from "./conquestOrchestrator";
import { registerInvasionCompletionHandler } from "./invasionOrchestrator";
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
  SubmittedAnswer,
  toSafeClientQuestion,
  FinalResult,
  AnswerReveal,
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
import { GameResult, saveGameSession } from "./gamePersistence";
import { removeRoomAccess } from "./roomAccess";
import { getAnswerFeedback, getBotAnswer, isAnswerCorrect, isSingleChoiceQuestion, normalizeSubmittedAnswer } from "./answers";

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
  answersThisRound: Record<string, { index?: number; answer?: SubmittedAnswer; timestamp: number; latencyMs: number }>;
  lastAnswerByPlayer: Record<string, boolean>; // for WHOLE power-up
  activeEffects: import("@quiz-battle/shared").ActivePowerUpEffect[];
  categories?: string[];
  subcategories?: string[];
  language: 'en' | 'ar';
  // Conquest mode
  territories?: Record<string, string | null>; // territory id -> team/player id
  playerTerritories?: Record<string, string[]>; // playerId -> territory ids
  finalResults?: FinalResult[];
  resultsPersisted?: boolean;
  isPrivate?: boolean;
}

interface ScoredAnswer {
  userId: string;
  answerIndex: number;
  timestamp: number;
  isCorrect: boolean;
  scoreDelta: number;
  latencyMs: number;
  round: number;
}

// Map of active game states in memory (for this worker)
const activeGames = new Map<string, GameState>();
// Keep scoring history private instead of spreading it into room snapshots.
const answerHistories = new Map<string, Map<string, ScoredAnswer[]>>();
const resultTimers = new Map<string, Set<ReturnType<typeof setTimeout>>>();
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

export function getViewerAnswerResult(
  gameId: string, userId: string
): (AnswerReveal & { scoreDelta: number; newScore: number }) | null {
  const game = activeGames.get(gameId);
  const question = game?.questions[game.currentRound - 1];
  const player = game?.players[userId];
  if (!game || game.status !== GameStatus.AnswerReveal || !question || !player) return null;
  const answer = answerHistories.get(gameId)?.get(userId)?.find(record => record.round === game.currentRound);
  return {
    ...getAnswerFeedback(question), correct: answer?.isCorrect ?? false,
    scoreDelta: answer?.scoreDelta ?? 0, newScore: player.score,
  };
}

export function setActiveGame(gameId: string, state: GameState): void {
  activeGames.set(gameId, state);
}

export function removeActiveGame(gameId: string): void {
  activeGames.delete(gameId);
  answerHistories.delete(gameId);
  clearResultTimers(gameId);
  removeRoomAccess(gameId);
  clearUsedQuestions(gameId); // Clean up question tracking
}

function clearResultTimers(gameId: string): void {
  for (const timer of resultTimers.get(gameId) || []) clearTimeout(timer);
  resultTimers.delete(gameId);
}

function scheduleResultTask(game: GameState, delayMs: number, task: () => void): void {
  const timers = resultTimers.get(game.gameId) || new Set<ReturnType<typeof setTimeout>>();
  const timer = setTimeout(() => {
    timers.delete(timer);
    if (activeGames.get(game.gameId) === game) task();
  }, delayMs);
  timer.unref();
  timers.add(timer);
  resultTimers.set(game.gameId, timers);
}

// ─── Game Lifecycle ─────────────────────────────────────────

export async function startGame(
  io: TypedServer,
  redis: SafeRedis,
  gameId: string
): Promise<void> {
  const game = activeGames.get(gameId);
  if (!game) return;
  answerHistories.set(gameId, new Map());
  game.finalResults = undefined;
  game.resultsPersisted = undefined;

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
    gameId, // Pass gameId to track used questions
    { singleChoiceOnly: game.mode === GameMode.Chaos || game.mode === GameMode.Conquest }
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

    const clientQuestion = toSafeClientQuestion(q);
    


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
        if (game.status !== GameStatus.Question || game.questions[game.currentRound - 1]?.id !== q.id) return;
        if (game.answersThisRound[bot.userId]) return; // Already answered
        const answer = getBotAnswer(q, isCorrect);
        // Bots follow the same validation and one-time reveal scoring as humans.
        if (answer !== undefined) handlePlayerAnswer(game, io, redis, bot.userId, q.id, answer, Date.now());
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
          return !ans || !isAnswerCorrect(q, ans.answer ?? ans.index);
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
  _correctIndex: number
): Promise<void> {
  // Calculate individual scores first
  const currentQuestion = game.questions[game.currentRound - 1];

  Object.values(game.players).forEach((player) => {
    const answer = game.answersThisRound[player.userId];
    const isCorrect = isAnswerCorrect(currentQuestion, answer?.answer ?? answer?.index);
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
    if (answer) {
      const history = answerHistories.get(game.gameId);
      if (history) {
        const previous = history.get(player.userId) || [];
        previous.push({
          userId: player.userId,
          answerIndex: typeof (answer.answer ?? answer.index) === "number" ? (answer.answer ?? answer.index) as number : -1,
          timestamp: answer.timestamp, isCorrect, scoreDelta: delta, latencyMs: answer.latencyMs,
          round: game.currentRound,
        });
        history.set(player.userId, previous);
      }
    }

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
        const ownerIsCorrect = isAnswerCorrect(currentQuestion, ownerAnswer?.answer ?? ownerAnswer?.index);

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
      ...getAnswerFeedback(currentQuestion),
    });
  });

  // ROAST ONE RANDOM WRONG ANSWERER
  const wrongAnswerers = Object.values(game.players).filter(p => {
    const ans = game.answersThisRound[p.userId];
    return !ans || !isAnswerCorrect(currentQuestion, ans.answer ?? ans.index);
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
  const answerHistory = answerHistories.get(game.gameId) || new Map<string, ScoredAnswer[]>();
  await finishCompletedGame(io, game, computeFinalResults(game.players, answerHistory, game.difficulty));
}

async function finishCompletedGame(io: TypedServer, game: GameState, results: FinalResult[]): Promise<void> {
  if (game.status === GameStatus.Ended && game.finalResults) return;
  game.status = GameStatus.Ended;
  game.finalResults = results;

  // Track game completion
  await trackEvent("game_completed", game.hostId, { gameId: game.gameId, mode: game.mode });

  const completed: GameResult = {
    gameId: game.gameId, hostId: game.hostId, joinCode: game.joinCode,
    mode: game.mode, difficulty: game.difficulty, language: game.language,
    category: game.categories?.join(", "), totalRounds: game.totalRounds,
    players: results, winnerId: results[0]?.userId, winnerScore: results[0]?.score,
    questionIds: game.questions.map(question => question.id), endedAt: new Date(),
  };
  try {
    await saveGameSession(completed);
    game.resultsPersisted = true;
  } catch (error) {
    game.resultsPersisted = false;
    console.error("[GamePersistence] Completed results are pending:", error);
  }

  io.to(game.gameId).emit("game:end", {
    results,
    xpAwarded: results[0]?.xpEarned ?? 0,
    resultsPersisted: game.resultsPersisted,
  });

  if (game.resultsPersisted) {
    scheduleResultTask(game, 30000, () => removeActiveGame(game.gameId));
  } else {
    // Preserve the live result during a temporary outage, with bounded retries
    // and the room's two-hour memory limit. Never claim a failed write was saved.
    scheduleResultTask(game, 2 * 60 * 60 * 1000, () => removeActiveGame(game.gameId));
    const retryDelays = [5000, 15000, 30000];
    const retry = (attempt: number) => {
      scheduleResultTask(game, retryDelays[attempt], () => {
        saveGameSession(completed).then(() => {
          if (activeGames.get(game.gameId) !== game) return;
          game.resultsPersisted = true;
          clearResultTimers(game.gameId);
          scheduleResultTask(game, 30000, () => removeActiveGame(game.gameId));
        }).catch(error => {
          console.error("[GamePersistence] Completed results retry failed:", error);
          if (activeGames.get(game.gameId) === game && attempt + 1 < retryDelays.length) retry(attempt + 1);
        });
      });
    };
    retry(0);
  }
}

registerInvasionCompletionHandler(async (io, completed) => {
  const game = activeGames.get(completed.gameId);
  if (!game || game.mode !== GameMode.Conquest) throw new Error("Conquest room is no longer available");
  game.totalRounds = completed.totalRounds;
  const results = completed.playerIds.map(userId => {
    const player = game.players[userId];
    const score = completed.scores[userId] || 0;
    if (player) player.score = score;
    return {
      userId, username: player?.username || completed.playerNames[userId] || userId,
      ...(player?.avatar ? { avatar: player.avatar } : {}),
      score, rank: 0,
      // Territory scoring does not track quiz-answer counts or response times.
      correctAnswers: 0, totalAnswers: 0, avgAnswerTime: 0, xpEarned: 0,
    };
  }).sort((a, b) => b.score - a.score);
  results.forEach((result, index) => result.rank = index + 1);
  await finishCompletedGame(io, game, results);
});

// ─── Player Answer Handler ───────────────────────────────────

export async function handlePlayerAnswer(
  game: GameState,
  io: TypedServer,
  redis: SafeRedis,
  userId: string,
  questionId: string,
  submittedAnswer: SubmittedAnswer,
  clientTimestamp: number
): Promise<void> {
  const q = game.questions[game.currentRound - 1];
  if (!q || q.id !== questionId) return;
  const player = game.players[userId];
  if (game.status !== GameStatus.Question || !player || player.isEliminated || !player.isConnected) return;
  const answer = normalizeSubmittedAnswer(q, submittedAnswer);
  if (answer === undefined) return;

  // Anti-cheat: reject duplicate answers
  if (game.answersThisRound[userId]) return;

  // Freeze blocks answer submission while active.
  if (isPlayerFrozen(game, userId)) return;

  // Anti-cheat: validate timing
  if (!isTimingValid(clientTimestamp, game.questionStartTime, getEffectiveTimeLimitMs(game, userId, q))) return;

  const latencyMs = Date.now() - game.questionStartTime;
  const isCorrect = isAnswerCorrect(q, answer);
  
  // Record answer for anti-cheat analysis
  recordAnswer({
    userId,
    questionId,
    answerTime: latencyMs,
    correct: isCorrect,
    timestamp: Date.now(),
  });
  
  game.answersThisRound[userId] = {
    answer,
    ...(typeof answer === "number" ? { index: answer } : {}),
    timestamp: Date.now(), latencyMs,
  };
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
  if (type === PowerUpType.FiftyFifty && !isSingleChoiceQuestion(game.questions[game.currentRound - 1])) {
    return { success: false, error: "50/50 is only available for single-choice questions" };
  }

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
  startedAt: number;
  timerHandle: ReturnType<typeof setTimeout> | null;
}

const powerUpSelections = new Map<string, PowerUpSelectionState>(); // gameId -> selection state

export function getPowerUpSelectionSnapshot(
  gameId: string,
  userId: string
): import("@quiz-battle/shared").SyncedGameRoom["powerUpSelection"] {
  const selection = powerUpSelections.get(gameId);
  if (!selection) return undefined;
  return {
    availablePowerUps: [...STARTER_POWER_UPS],
    selectedPowerUps: [...(selection.selections[userId] || [])],
    maxSelections: MAX_POWERUP_SELECTIONS,
    timeLeft: Math.max(0, Math.ceil((selection.startedAt + POWERUP_SELECTION_TIME_MS - Date.now()) / 1000)),
    isSelecting: !selection.confirmed.has(userId),
  };
}

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
    startedAt: Date.now(),
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

import { FastifyPluginAsync } from "fastify";
import { nanoid } from "nanoid";
import {
  GameMode,
  GameStatus,
  Difficulty,
  GAME_MODE_CONFIG,
} from "@quiz-battle/shared";
import { prisma } from "@quiz-battle/db";
import { KEYS } from "../lib/redis";
import { setActiveGame } from "../lib/gameOrchestrator";
import type { JWTPayload } from "./auth";

// Local fallback for join code resolution (works without Redis)
const localJoinCodes = new Map<string, string>(); // code -> gameId

function generateJoinCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function getCreditTier(totalRounds: number): "short" | "long" {
  if (totalRounds <= 5) return "short";
  return "long";
}

export const gamesRouter: FastifyPluginAsync = async (app) => {
  // POST /api/games — Create a game room
  app.post<{
    Body: {
      mode: GameMode;
      difficulty: Difficulty;
      rounds?: number; // 1-15 rounds, host can customize
      categories?: string[];
      subcategories?: string[];
      language?: "en" | "ar";
      userId?: string;
      username?: string;
      password?: string; // For private rooms
      isPrivate?: boolean;
    };
  }>("/", { onRequest: [app.authenticate] }, async (req, reply) => {
    const { mode, difficulty, rounds, categories, password, isPrivate } = req.body;
    const authUser = (req.user as Partial<JWTPayload> | undefined) ?? {};
    const userId = authUser.userId ?? req.body.userId;
    const usernameInput = (req.body.username ?? authUser.username ?? "").trim();
    const username =
      usernameInput.length > 0
        ? usernameInput.slice(0, 20)
        : `Warrior${Math.floor(Math.random() * 9999)}`;

    if (!userId) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    if (!Object.values(GameMode).includes(mode)) {
      return reply.status(400).send({ error: "Invalid game mode" });
    }
    if (!Object.values(Difficulty).includes(difficulty)) {
      return reply.status(400).send({ error: "Invalid difficulty" });
    }

    const config = GAME_MODE_CONFIG[mode];
    let totalRounds = config.rounds;
    if (rounds !== undefined) {
      totalRounds = Math.min(Math.max(rounds, 1), 15);
    }

    const creditTier = getCreditTier(totalRounds);
    const creditUseResult = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          hasPurchasedGame: true,
          shortGamesRemaining: true,
          longGamesRemaining: true,
        },
      });

      if (!user) {
        return { ok: false as const, statusCode: 404, error: "User not found" };
      }

      // All games require credits/subscription (no free tier)
      // For testing: Allow all games without purchase wall
      return {
        ok: true as const,
        shortGamesRemaining: user.shortGamesRemaining,
        longGamesRemaining: user.longGamesRemaining,
      };
    });

    if (!creditUseResult.ok) {
      return reply.status(creditUseResult.statusCode).send({ error: creditUseResult.error });
    }

    const redis = (app as unknown as { redis: import("../lib/redis").SafeRedis }).redis;
    let joinCode = "";
    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = generateJoinCode();
      const existsInMemory = localJoinCodes.has(candidate);
      const existsInRedis = redis ? await redis.get(KEYS.joinCode(candidate)) : null;
      if (!existsInMemory && !existsInRedis) {
        joinCode = candidate;
        break;
      }
    }

    if (!joinCode) {
      return reply.status(500).send({ error: "Failed to generate unique join code" });
    }

    const gameId = nanoid(10);

    const gameState = {
      gameId,
      joinCode,
      hostId: userId,
      mode,
      difficulty,
      status: GameStatus.Lobby,
      players: {
        [userId]: {
          userId,
          username,
          score: 0,
          rank: 0,
          streak: 0,
          isEliminated: false,
          isConnected: true,
          powerUpInventory: [],
        },
      },
      questions: [],
      currentRound: 0,
      totalRounds,
      maxPlayers: config.maxPlayers,
      questionStartTime: 0,
      answersThisRound: {},
      lastAnswerByPlayer: {},
      activeEffects: [],
      categories,
      subcategories: req.body.subcategories,
      language: (req.body.language as 'en' | 'ar') || 'en',
      password, // Store password for private rooms
      isPrivate: isPrivate || !!password,
      chat: [], // Initialize empty chat
      readyPlayers: [], // Initialize empty ready list
    };

    setActiveGame(gameId, gameState);

    // Store join code locally (always works) + Redis (if available)
    localJoinCodes.set(joinCode, gameId);
    if (redis) {
      await redis.set(KEYS.joinCode(joinCode), gameId, "EX", 7200);
    }

    return reply.status(201).send({
      gameId,
      joinCode,
      mode,
      difficulty,
      maxPlayers: config.maxPlayers,
      totalRounds,
      shortGamesRemaining: creditUseResult.shortGamesRemaining,
      longGamesRemaining: creditUseResult.longGamesRemaining,
    });
  });

  // GET /api/games/join/:code — Resolve join code to gameId
  app.get<{ Params: { code: string } }>("/join/:code", async (req, reply) => {
    const redis = (app as unknown as { redis: import("../lib/redis").SafeRedis }).redis;
    const code = req.params.code.toUpperCase();

    // Try Redis first, then local map
    const gameId = (redis ? await redis.get(KEYS.joinCode(code)) : null) || localJoinCodes.get(code) || null;
    if (!gameId) return reply.status(404).send({ error: "Game not found" });

    return reply.send({ gameId });
  });

  // GET /api/games/:gameId — Get game state (lobby info)
  app.get<{ Params: { gameId: string } }>("/:gameId", async (req, reply) => {
    const { getActiveGame } = await import("../lib/gameOrchestrator");
    const game = getActiveGame(req.params.gameId);
    if (!game) return reply.status(404).send({ error: "Game not found" });

    const { questions: _q, answersThisRound: _a, lastAnswerByPlayer: _l, ...safe } = game;
    return reply.send({
      ...safe,
      players: Object.values(safe.players),
    });
  });

  // GET /api/games/leaderboard/global — Global leaderboard
  app.get("/leaderboard/global", async (req, reply) => {
    const redis = (app as unknown as { redis: import("../lib/redis").SafeRedis }).redis;
    if (!redis) {
      // Fallback to database if Redis is not available
      const users = await prisma.user.findMany({
        
        take: 50,
        select: { id: true, username: true },
      });
      return reply.send(
        users.map((u, i) => ({ userId: u.id, username: u.username, score: 0, rank: i + 1 }))
      );
    }

    const entries = await redis.zrevrangebyscore(
      KEYS.leaderboard,
      "+inf",
      "-inf",
      "WITHSCORES",
      "LIMIT",
      0,
      50
    );

    // Get userIds from entries
    const userIds: string[] = [];
    for (let i = 0; i < entries.length; i += 2) {
      userIds.push(entries[i]);
    }

    // Fetch usernames from database
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true },
    });
    const usernameMap = new Map(users.map((u) => [u.id, u.username]));

    const leaderboard: { userId: string; username: string; score: number; rank: number }[] = [];
    for (let i = 0; i < entries.length; i += 2) {
      const userId = entries[i];
      leaderboard.push({
        userId,
        username: usernameMap.get(userId) || "Unknown Warrior",
        score: parseInt(entries[i + 1]),
        rank: i / 2 + 1,
      });
    }

    return reply.send(leaderboard);
  });

  // GET /api/games/active — Get a list of currently active games for spectating
  app.get("/active", async (req, reply) => {
    const { getAllActiveGames } = await import("../lib/gameOrchestrator");
    const games = getAllActiveGames();
    
    // Filter to only return games that are currently playing (not ended or just lobby)
    const activeGames = games
      .filter((g) => g.status !== GameStatus.Lobby && g.status !== GameStatus.Ended)
      .map((g) => ({
        gameId: g.gameId,
        mode: g.mode,
        difficulty: g.difficulty,
        status: g.status,
        playerCount: Object.keys(g.players).length,
        maxPlayers: g.maxPlayers,
        currentRound: g.currentRound,
        totalRounds: g.totalRounds,
      }))
      .slice(0, 20); // Return top 20 active games

    return reply.send(activeGames);
  });
};

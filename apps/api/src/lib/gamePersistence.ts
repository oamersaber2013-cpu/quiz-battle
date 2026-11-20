import { prisma } from "@quiz-battle/db";
import { GameMode, Difficulty, SavedGameResults } from "@quiz-battle/shared";

export interface GameResult {
  gameId: string;
  hostId: string;
  joinCode: string;
  mode: GameMode;
  difficulty: Difficulty;
  category?: string;
  language?: "en" | "ar";
  endedAt?: Date;
  totalRounds: number;
  players: Array<{
    userId: string;
    username: string;
    avatar?: string;
    score: number;
    rank: number;
    correctAnswers: number;
    totalAnswers: number;
    avgAnswerTime: number;
    powerUpsUsed?: string[];
    team?: string;
  }>;
  winnerId?: string;
  winnerScore?: number;
  questionIds?: string[];
}

export async function saveGameSession(result: GameResult): Promise<void> {
  const metadata = {
    hostId: result.hostId,
    joinCode: result.joinCode,
    mode: result.mode,
    difficulty: result.difficulty,
    language: result.language || "en",
    category: result.category,
    totalRounds: result.totalRounds,
    endedAt: result.endedAt || new Date(),
    winnerId: result.winnerId,
    winnerScore: result.winnerScore,
    questionIds: result.questionIds ? JSON.stringify(result.questionIds) : null,
  };
  const players = result.players.map(player => ({
    userId: player.userId, username: player.username, avatar: player.avatar,
    score: player.score, rank: player.rank, correctAnswers: player.correctAnswers,
    totalAnswers: player.totalAnswers, avgAnswerTime: player.avgAnswerTime,
    powerUpsUsed: player.powerUpsUsed ? JSON.stringify(player.powerUpsUsed) : null,
    team: player.team,
  }));
  const write = () => prisma.gameSession.upsert({
    where: { id: result.gameId },
    create: { id: result.gameId, ...metadata, playerStats: { create: players } },
    update: { ...metadata, playerStats: { deleteMany: {}, create: players } },
  });
  // The nested write commits the session and every standing together. A retry
  // replaces the same room's rows instead of creating duplicate history.
  try {
    await write();
  } catch (error) {
    // Concurrent first-save upserts can race on the room's primary key.
    if ((error as { code?: string }).code !== "P2002") throw error;
    await write();
  }
}

export async function getSavedGameResults(gameId: string, viewerId: string): Promise<
  { status: "found"; data: SavedGameResults } | { status: "not_found" | "forbidden" }
> {
  const session = await prisma.gameSession.findUnique({
    where: { id: gameId },
    include: { playerStats: { orderBy: { rank: "asc" } } },
  });
  if (!session || !session.endedAt) return { status: "not_found" };
  if (session.hostId !== viewerId && !session.playerStats.some(player => player.userId === viewerId))
    return { status: "forbidden" };
  return {
    status: "found",
    data: {
      gameId: session.id, mode: session.mode as GameMode, difficulty: session.difficulty as Difficulty,
      language: session.language === "ar" ? "ar" : "en", totalRounds: session.totalRounds,
      endedAt: session.endedAt.toISOString(),
      results: session.playerStats.map(player => ({
        userId: player.userId, username: player.username,
        ...(player.avatar ? { avatar: player.avatar } : {}),
        score: player.score, rank: player.rank, correctAnswers: player.correctAnswers,
        totalAnswers: player.totalAnswers, avgAnswerTime: player.avgAnswerTime, xpEarned: 0,
      })),
    },
  };
}

export async function getGameHistory(userId: string, limit: number = 10) {
  const stats = await prisma.playerGameStat.findMany({
    where: { userId, gameSession: { endedAt: { not: null } } },
    select: {
      score: true, rank: true,
      gameSession: { select: { id: true, mode: true, endedAt: true, _count: { select: { playerStats: true } } } },
    },
    orderBy: [{ gameSession: { endedAt: "desc" } }, { gameSessionId: "asc" }],
    take: limit,
  });
  return stats.map(({ gameSession, score, rank }) => ({
    id: gameSession.id, mode: gameSession.mode, endedAt: gameSession.endedAt,
    playerCount: gameSession._count.playerStats, score, rank,
  }));
}

export async function getLeaderboard(mode?: GameMode, limit: number = 50) {
  try {
    const where = mode ? { mode } : {};

    const topGames = await prisma.gameSession.findMany({
      where,
      include: {
        playerStats: {
          orderBy: { score: "desc" },
          take: 1,
        },
      },
      orderBy: { winnerScore: "desc" },
      take: limit,
    });

    return topGames.map((game) => ({
      gameId: game.id,
      joinCode: game.joinCode,
      mode: game.mode,
      difficulty: game.difficulty,
      winner: game.playerStats[0] || null,
      playedAt: game.playedAt,
    }));
  } catch (error) {
    console.error("[GamePersistence] Failed to get leaderboard:", error);
    return [];
  }
}

export async function getUserStats(userId: string) {
  const where = { userId, gameSession: { endedAt: { not: null } } };
  const [user, totals, wins, history] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: {
      createdAt: true, achievements: { select: { achievement: { select: { nameEn: true, nameAr: true } } } },
    } }),
    prisma.playerGameStat.aggregate({ where, _count: true, _sum: { score: true, totalAnswers: true, correctAnswers: true } }),
    prisma.playerGameStat.count({ where: { ...where, rank: 1 } }),
    getGameHistory(userId),
  ]);
  if (!user) return null;
  return {
    memberSince: user.createdAt, achievements: user.achievements.map(row => row.achievement),
    totalGames: totals._count, wins, totalScore: totals._sum.score ?? 0,
    totalAnswers: totals._sum.totalAnswers ?? 0, correctAnswers: totals._sum.correctAnswers ?? 0, history,
  };
}

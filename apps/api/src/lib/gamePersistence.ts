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
  try {
    const stats = await prisma.playerGameStat.findMany({
      where: { userId },
      include: {
        gameSession: true,
      },
      orderBy: { joinedAt: "desc" },
      take: limit,
    });

    return stats.map((stat) => ({
      id: stat.gameSession.id,
      joinCode: stat.gameSession.joinCode,
      mode: stat.gameSession.mode,
      difficulty: stat.gameSession.difficulty,
      totalRounds: stat.gameSession.totalRounds,
      playedAt: stat.gameSession.playedAt,
      playerStats: {
        score: stat.score,
        rank: stat.rank,
        correctAnswers: stat.correctAnswers,
        totalAnswers: stat.totalAnswers,
        powerUpsUsed: stat.powerUpsUsed ? JSON.parse(stat.powerUpsUsed) : [],
      },
    }));
  } catch (error) {
    console.error("[GamePersistence] Failed to get game history:", error);
    return [];
  }
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
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
      },
    });

    if (!user) return null;

    // Calculate additional stats
    const playerStats = await prisma.playerGameStat.findMany({
      where: { userId },
    });

    const stats = playerStats.reduce(
      (acc, s) => {
        acc.winCount += s.rank === 1 ? 1 : 0;
        acc.totalGamesPlayed += 1;
        acc.totalQuestionsAnswered += s.totalAnswers;
        acc.totalCorrectAnswers += s.correctAnswers;
        acc.totalScore += s.score;
        return acc;
      },
      {
        winCount: 0,
        totalGamesPlayed: 0,
        totalQuestionsAnswered: 0,
        totalCorrectAnswers: 0,
        totalScore: 0,
      }
    );

    return {
      userId,
      username: user.username,
      ...stats,
      avgScore: playerStats.length > 0 ? stats.totalScore / playerStats.length : 0,
      winRate: playerStats.length > 0 ? stats.winCount / playerStats.length : 0,
      rank: "bronze",
      xp: 0,
    };
  } catch (error) {
    console.error("[GamePersistence] Failed to get user stats:", error);
    return null;
  }
}


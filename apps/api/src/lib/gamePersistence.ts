import { prisma } from "@quiz-battle/db";
import { GameRoom, GameMode, Difficulty, QuestionCategory } from "@quiz-battle/shared";

interface GameResult {
  gameId: string;
  joinCode: string;
  mode: GameMode;
  difficulty: Difficulty;
  category?: QuestionCategory;
  totalRounds: number;
  players: Array<{
    userId: string;
    username: string;
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
  try {
    // Create game session
    const gameSession = await prisma.gameSession.create({
      data: {
        joinCode: result.joinCode,
        mode: result.mode,
        difficulty: result.difficulty,
        category: result.category,
        totalRounds: result.totalRounds,
        winnerId: result.winnerId,
        winnerScore: result.winnerScore,
        questionIds: result.questionIds ? JSON.stringify(result.questionIds) : null,
      },
    });

    // Create player stats for each player
    await Promise.all(
      result.players.map(async (player) => {
        await prisma.playerGameStat.create({
          data: {
            gameSessionId: gameSession.id,
            userId: player.userId,
            username: player.username,
            score: player.score,
            rank: player.rank,
            correctAnswers: player.correctAnswers,
            totalAnswers: player.totalAnswers,
            avgAnswerTime: player.avgAnswerTime,
            powerUpsUsed: player.powerUpsUsed ? JSON.stringify(player.powerUpsUsed) : null,
            team: player.team,
          },
        });
      })
    );

    console.log(`[GamePersistence] Saved game session: ${gameSession.id}`);
  } catch (error) {
    console.error("[GamePersistence] Failed to save game session:", error);
  }
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


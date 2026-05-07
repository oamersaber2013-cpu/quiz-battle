import { prisma } from "@quiz-battle/db";

export async function trackEvent(
  eventType: string,
  userId?: string,
  eventData?: any,
  sessionId?: string
) {
  try {
    await prisma.analyticsEvent.create({
      data: {
        eventType,
        userId,
        eventData: eventData ? JSON.stringify(eventData) : null,
        sessionId,
      },
    });
  } catch (error) {
    console.error("Analytics tracking error:", error);
  }
}

export async function getEventStats(eventType: string, days: number = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  const events = await prisma.analyticsEvent.findMany({
    where: {
      eventType,
      createdAt: { gte: since },
    },
  });
  
  return {
    total: events.length,
    perDay: events.length / days,
    uniqueUsers: new Set(events.map(e => e.userId).filter(Boolean)).size,
  };
}

export async function getUserActivity(userId: string, days: number = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  const events = await prisma.analyticsEvent.findMany({
    where: {
      userId,
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "desc" },
  });
  
  return events;
}

export async function updateLeaderboard() {
  const periods = [
    { key: "daily", days: 1 },
    { key: "weekly", days: 7 },
    { key: "monthly", days: 30 },
  ];
  
  for (const period of periods) {
    const since = new Date(Date.now() - period.days * 24 * 60 * 60 * 1000);
    
    const users = await prisma.user.findMany({
      where: {
        updatedAt: { gte: since },
      },
      select: {
        id: true,
        username: true,
        totalWins: true,
        totalGamesPlayed: true,
      },
    });
    
    for (const user of users) {
      const winRate = user.totalGamesPlayed > 0 ? user.totalWins / user.totalGamesPlayed : 0;
      const score = user.totalWins * 100 + Math.floor(winRate * 1000);
      
      await prisma.leaderboard.upsert({
        where: {
          userId_period_periodStart: {
            userId: user.id,
            period: period.key,
            periodStart: since,
          },
        },
        create: {
          userId: user.id,
          username: user.username,
          score,
          wins: user.totalWins,
          gamesPlayed: user.totalGamesPlayed,
          winRate,
          period: period.key,
          periodStart: since,
        },
        update: {
          score,
          wins: user.totalWins,
          gamesPlayed: user.totalGamesPlayed,
          winRate,
        },
      });
    }
  }
}

setInterval(updateLeaderboard, 5 * 60 * 1000);

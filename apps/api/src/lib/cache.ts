import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

const CACHE_TTL = {
  questions: 3600,
  leaderboard: 300,
  userStats: 600,
  gameState: 1800,
};

export async function cacheSet(key: string, value: any, ttl?: number) {
  try {
    const serialized = JSON.stringify(value);
    if (ttl) {
      await redis.setex(key, ttl, serialized);
    } else {
      await redis.set(key, serialized);
    }
  } catch (error) {
    console.error("Cache set error:", error);
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Cache get error:", error);
    return null;
  }
}

export async function cacheDel(key: string) {
  try {
    await redis.del(key);
  } catch (error) {
    console.error("Cache delete error:", error);
  }
}

export async function cacheQuestions(category: string, difficulty: string, questions: any[]) {
  const key = `questions:${category}:${difficulty}`;
  await cacheSet(key, questions, CACHE_TTL.questions);
}

export async function getCachedQuestions(category: string, difficulty: string) {
  const key = `questions:${category}:${difficulty}`;
  return cacheGet<any[]>(key);
}

export async function cacheLeaderboard(period: string, data: any[]) {
  const key = `leaderboard:${period}`;
  await cacheSet(key, data, CACHE_TTL.leaderboard);
}

export async function getCachedLeaderboard(period: string) {
  const key = `leaderboard:${period}`;
  return cacheGet<any[]>(key);
}

export async function cacheUserStats(userId: string, stats: any) {
  const key = `user:${userId}:stats`;
  await cacheSet(key, stats, CACHE_TTL.userStats);
}

export async function getCachedUserStats(userId: string) {
  const key = `user:${userId}:stats`;
  return cacheGet<any>(key);
}

export async function invalidateUserCache(userId: string) {
  await cacheDel(`user:${userId}:stats`);
}

redis.on("error", (err) => {
  console.error("Redis error:", err);
});

redis.on("connect", () => {
  console.log("Redis connected");
});

export { redis };
